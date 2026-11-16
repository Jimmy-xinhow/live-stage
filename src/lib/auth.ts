import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { performers } from "./db/schema";
import { env } from "./env";
import { applyPoints } from "./billing";
import { createSession, getSession } from "./session";
import type { LineProfile } from "./line";

/** 藝人用 LINE 登入；第一次登入自動建立頁面並贈送新手點數 */
export async function loginWithLine(profile: LineProfile, role: "performer" | "organizer" = "performer") {
  const db = await getDb();
  let [p] = await db.select().from(performers).where(eq(performers.lineUserId, profile.userId));
  if (!p) {
    [p] = await db
      .insert(performers)
      .values({ slug: `${role === "organizer" ? "v" : "u"}${crypto.randomBytes(3).toString("hex")}`, lineUserId: profile.userId, displayName: profile.name || "新朋友", avatarUrl: profile.picture ?? null, accountType: role })
      .returning();
    if (env.billing.signupBonusCents) await applyPoints(db, p.id, env.billing.signupBonusCents, "signup_bonus", { note: "新手贈點" });
  }
  await createSession({ performerId: p.id, lineUserId: profile.userId, isAdmin: env.adminLineUserIds.includes(profile.userId) });
  return p;
}

/** 任何登入的帳號（表演者或店家主辦） */
export async function requireAccount() {
  const s = await getSession();
  if (!s?.performerId) return null;
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.id, s.performerId));
  return p ? { session: s, performer: p } : null;
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

export const homeOf = (accountType: string) => (accountType === "organizer" ? "/org" : "/dashboard");
