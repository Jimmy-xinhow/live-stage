import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { authTokens, performers } from "./db/schema";
import { env } from "./env";
import { applyPoints } from "./billing";
import { createSession, getSession } from "./session";
import { FEATURES } from "./features";
import { checkPassword, hashPassword, hashToken, needsRehash, newToken, verifyPassword } from "./password";
import { sendMail, signature } from "./mail";

export class AuthError extends Error {}

/** 信箱一律存小寫去空白，否則同一個人會因為大小寫開出兩個帳號 */
export const normalizeEmail = (s: string) => s.trim().toLowerCase();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const looksLikeEmail = (s: string) => EMAIL_RE.test(s);

const isAdminEmail = (email: string) => env.adminEmails.includes(normalizeEmail(email));

/** 註冊。第一次建立就送新手點數，並寄一封驗證信 */
export async function signUp(input: { email: string; password: string; displayName: string }) {
  const email = normalizeEmail(input.email);
  if (!looksLikeEmail(email)) throw new AuthError("這個信箱看起來不太對");
  const bad = checkPassword(input.password);
  if (bad) throw new AuthError(bad);
  const name = input.displayName.trim().slice(0, 40) || "新朋友";

  const db = await getDb();
  const [exists] = await db.select({ id: performers.id }).from(performers).where(eq(performers.email, email));
  if (exists) throw new AuthError("這個信箱已經註冊過了。直接登入，或用「忘記密碼」重設。");

  const [p] = await db
    .insert(performers)
    .values({
      slug: `u${crypto.randomBytes(3).toString("hex")}`,
      email,
      passwordHash: await hashPassword(input.password),
      displayName: name,
      accountType: "performer",
    })
    .returning();

  if (env.billing.signupBonusCents) await applyPoints(db, p.id, env.billing.signupBonusCents, "signup_bonus", { note: "新手贈點" });
  await createSession({ performerId: p.id, isAdmin: isAdminEmail(email) });
  await sendVerifyMail(p.id, email, name).catch(() => {});
  return p;
}

/**
 * 登入。
 *
 * 帳號不存在和密碼錯誤回同一句話——分開講等於告訴對方「這個信箱有註冊」，
 * 那是免費送人一份可用帳號清單。
 */
export async function signIn(email0: string, password: string) {
  const email = normalizeEmail(email0);
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.email, email));

  const ok = p ? await verifyPassword(password, p.passwordHash) : false;
  if (!p || !ok) {
    // 沒有這個帳號時也算一次雜湊，讓回應時間一致，不要從快慢反推帳號存在與否
    if (!p) await hashPassword(password).catch(() => null);
    throw new AuthError("信箱或密碼不對");
  }
  if (p.status !== "active") throw new AuthError("這個帳號已被停用。有疑問請來信。");

  // 成本參數調高之後，趁登入成功順手把舊雜湊升級
  if (needsRehash(p.passwordHash)) {
    await db.update(performers).set({ passwordHash: await hashPassword(password) }).where(eq(performers.id, p.id));
  }
  await createSession({ performerId: p.id, isAdmin: isAdminEmail(email) });
  return p;
}

/* ───────────── 信箱驗證與重設密碼 ───────────── */

const TOKEN_TTL = { verify: 7 * 86400_000, reset: 60 * 60_000 };

async function issueToken(performerId: string, kind: "verify" | "reset") {
  const db = await getDb();
  const { raw, hash } = newToken();
  await db.insert(authTokens).values({ performerId, kind, tokenHash: hash, expiresAt: new Date(Date.now() + TOKEN_TTL[kind]) });
  return raw;
}

async function useToken(raw: string, kind: "verify" | "reset") {
  const db = await getDb();
  const [t] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, hashToken(raw)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())));
  if (!t) return null;
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, t.id));
  return t;
}

export async function sendVerifyMail(performerId: string, email: string, name: string) {
  const raw = await issueToken(performerId, "verify");
  return sendMail({
    to: email,
    subject: "確認一下你的信箱",
    text:
      `${name} 你好，\n\n點下面這條連結就完成信箱確認：\n${env.baseUrl}/auth/verify?t=${raw}\n\n` +
      `連結七天內有效。確認之後，忘記密碼時才有辦法把帳號還給你。\n` +
      `如果這不是你本人操作，忽略這封信就好。` + signature(),
  });
}

export async function verifyEmail(raw: string) {
  const t = await useToken(raw, "verify");
  if (!t) return null;
  const db = await getDb();
  const [p] = await db.update(performers).set({ emailVerifiedAt: new Date() }).where(eq(performers.id, t.performerId)).returning();
  return p ?? null;
}

/**
 * 寄重設信。
 *
 * 不管信箱存不存在都回成功——否則這個端點就變成查詢「誰有註冊」的工具。
 */
export async function requestReset(email0: string) {
  const email = normalizeEmail(email0);
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.email, email));
  if (!p) return;
  const raw = await issueToken(p.id, "reset");
  await sendMail({
    to: email,
    subject: "重設密碼",
    text:
      `點下面這條連結設一組新密碼：\n${env.baseUrl}/auth/reset?t=${raw}\n\n` +
      `連結一小時內有效，而且只能用一次。\n` +
      `如果不是你要求的，忽略這封信，你的密碼不會有任何改變。` + signature(),
  }).catch(() => {});
}

export async function resetPassword(raw: string, password: string) {
  const bad = checkPassword(password);
  if (bad) throw new AuthError(bad);
  const t = await useToken(raw, "reset");
  if (!t) throw new AuthError("這條連結已經失效了。重新要一封新的。");
  const db = await getDb();
  const now = new Date();
  const [p] = await db
    .update(performers)
    // 重設密碼同時視為信箱已驗證：他收得到信，就證明信箱是他的
    .set({ passwordHash: await hashPassword(password), passwordChangedAt: now, emailVerifiedAt: now })
    .where(eq(performers.id, t.performerId))
    .returning();
  if (!p) throw new AuthError("找不到帳號");
  // 其他裝置上的 session 一律作廢
  await db.update(authTokens).set({ usedAt: now }).where(and(eq(authTokens.performerId, p.id), eq(authTokens.kind, "reset"), isNull(authTokens.usedAt)));
  await createSession({ performerId: p.id, isAdmin: isAdminEmail(p.email ?? "") });
  return p;
}

/** 後台自己改密碼：要先驗舊的 */
export async function changePassword(performerId: string, current: string, next: string) {
  const bad = checkPassword(next);
  if (bad) throw new AuthError(bad);
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.id, performerId));
  if (!p || !(await verifyPassword(current, p.passwordHash))) throw new AuthError("目前的密碼不對");
  await db.update(performers).set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date() }).where(eq(performers.id, p.id));
}

/* ───────────── 取用目前身分 ───────────── */

/** 任何登入的帳號（表演者或店家主辦） */
export async function requireAccount() {
  const s = await getSession();
  if (!s?.performerId) return null;
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.id, s.performerId));
  if (!p || p.status !== "active") return null;
  // 改過密碼之後，舊 session 一律失效
  if (p.passwordChangedAt && s.issuedAt && p.passwordChangedAt.getTime() > s.issuedAt * 1000) return null;
  return { session: s, performer: p };
}

/** 表演者後台與 API：店家主辦帳號不能進 */
export async function requirePerformer() {
  const a = await requireAccount();
  return a && a.performer.accountType === "performer" ? a : null;
}

export async function requireOrganizer() {
  const a = await requireAccount();
  return a && a.performer.accountType === "organizer" ? a : null;
}

// 店家主辦後台在這一輪收斂中關閉了；功能開回來之前，主辦帳號一律導回首頁
export const homeOf = (accountType: string) =>
  accountType === "organizer" ? (FEATURES.events ? "/org" : "/") : "/dashboard";
