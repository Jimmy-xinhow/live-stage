import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb, type DB } from "./db";
import { bandMembers, orderSplits, orders, performers } from "./db/schema";
import { track } from "./usage";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * 樂團拆帳。
 *
 * 重要前提：**平台不經手款項**。錢進的是團長的收款帳戶，這裡做的是把每一筆
 * 該怎麼分算好、各自只看到自己的數字。不要在任何文案裡說成會自動匯款給團員。
 *
 * 比例用千分之一為單位，不用百分比——三個人均分是 333/333/334，用百分比就
 * 只能寫 33/33/34，每一千元差掉三塊，一個月下來對不起來。
 */

export const PERMILLE = 1000;

/** 把一筆金額照比例分完，餘數給第一位。保證各份加起來等於原始金額 */
export function splitAmount(amount: number, shares: number[]) {
  const out = shares.map((s) => Math.floor((amount * s) / PERMILLE));
  const rest = amount - out.reduce((a, b) => a + b, 0);
  if (out.length) out[0] += rest;
  return out;
}

export async function listMembers(performerId: string) {
  const db = await getDb();
  return db.select().from(bandMembers).where(eq(bandMembers.performerId, performerId)).orderBy(asc(bandMembers.createdAt));
}

export type MemberInput = { id?: string; name: string; sharePermille: number };

/** 邀請碼。不含容易看錯的 0/O/1/I/l */
const CODE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () => Array.from({ length: 8 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join("");

/**
 * 整組覆寫團員名單。
 * 一次送全部而不是逐筆增刪，因為比例必須隨時加起來是 1000——
 * 分開改的話中間一定會有一段是不合的狀態。
 */
export async function saveMembers(performerId: string, input: MemberInput[]) {
  const clean = input.map((m) => ({ ...m, name: m.name.trim().slice(0, 40) })).filter((m) => m.name);
  if (clean.length > 12) return { ok: false as const, error: "最多 12 位團員" };
  const total = clean.reduce((n, m) => n + m.sharePermille, 0);
  if (clean.length && total !== PERMILLE) {
    return { ok: false as const, error: `比例加起來要是 100%，現在是 ${(total / 10).toFixed(1)}%` };
  }
  if (clean.some((m) => m.sharePermille < 0 || m.sharePermille > PERMILLE)) return { ok: false as const, error: "比例不正確" };
  const db = await getDb();
  await db.transaction(async (tx) => {
    const old = await tx.select().from(bandMembers).where(eq(bandMembers.performerId, performerId));
    const byId = new Map(old.map((m) => [m.id, m]));
    // 歷史的拆帳快照不受影響，刪團員不會動到已經發生的帳。
    // 留著原本的邀請碼與綁定，否則改一次名字團員就要重新加入一次。
    await tx.delete(bandMembers).where(eq(bandMembers.performerId, performerId));
    if (clean.length)
      await tx.insert(bandMembers).values(
        clean.map((m) => {
          const prev = m.id ? byId.get(m.id) : undefined;
          return {
            id: prev?.id,
            performerId,
            name: m.name,
            sharePermille: m.sharePermille,
            inviteCode: prev?.inviteCode ?? newCode(),
            lineUserId: prev?.lineUserId ?? null,
          };
        }),
      );
  });
  track("band_save", performerId);
  return { ok: true as const };
}

/**
 * 訂單付款成功時留下拆帳快照。在 markOrderPaid 的交易裡呼叫。
 * 沒有設定團員就什麼都不做——一個人演出的情況佔多數，不該因此多出空紀錄。
 */
export async function recordSplit(tx: Tx, performerId: string, orderId: string, amount: number) {
  const ms = await tx.select().from(bandMembers).where(eq(bandMembers.performerId, performerId)).orderBy(asc(bandMembers.createdAt));
  if (ms.length < 2) return;
  const parts = splitAmount(amount, ms.map((m) => m.sharePermille));
  await tx.insert(orderSplits).values(
    ms.map((m, i) => ({ orderId, performerId, memberId: m.id, memberName: m.name, sharePermille: m.sharePermille, amount: parts[i] })),
  );
}

/** 某個月每位團員分到多少。退款的訂單不算 */
export async function monthlySplit(performerId: string, year: number, month: number) {
  const db = await getDb();
  const from = new Date(Date.UTC(year, month - 1, 1, -8));
  const to = new Date(Date.UTC(year, month, 1, -8));
  const rows = await db
    .select({
      name: orderSplits.memberName,
      memberId: orderSplits.memberId,
      total: sql<number>`sum(${orderSplits.amount})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orderSplits)
    .innerJoin(orders, eq(orders.id, orderSplits.orderId))
    .where(and(
      eq(orderSplits.performerId, performerId),
      eq(orders.status, "paid"),
      gte(orders.paidAt, from),
      lt(orders.paidAt, to),
    ))
    .groupBy(orderSplits.memberName, orderSplits.memberId)
    .orderBy(desc(sql`sum(${orderSplits.amount})`));
  return rows.map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) }));
}

/** 團員用邀請碼把自己的 LINE 帳號綁上去 */
export async function joinBand(code: string, lineUserId: string) {
  const db = await getDb();
  const [m] = await db.select().from(bandMembers).where(eq(bandMembers.inviteCode, code.trim().toUpperCase()));
  if (!m) return { ok: false as const, error: "邀請碼不正確，或這個團員已經被移除" };
  if (m.lineUserId && m.lineUserId !== lineUserId) return { ok: false as const, error: "這個邀請碼已經被別人用了，跟團長要一個新的" };
  await db.update(bandMembers).set({ lineUserId }).where(eq(bandMembers.id, m.id));
  track("band_join", m.performerId);
  return { ok: true as const, memberId: m.id, name: m.name };
}

/** 這個 LINE 帳號是哪些團的團員。給團員登入後看自己的拆帳用 */
export async function bandsOf(lineUserId: string) {
  const db = await getDb();
  return db
    .select({
      memberId: bandMembers.id,
      memberName: bandMembers.name,
      sharePermille: bandMembers.sharePermille,
      performerId: performers.id,
      bandName: performers.displayName,
      bandSlug: performers.slug,
    })
    .from(bandMembers)
    .innerJoin(performers, eq(performers.id, bandMembers.performerId))
    .where(eq(bandMembers.lineUserId, lineUserId));
}

/** 單一團員某個月的明細 */
export async function memberMonth(memberId: string, year: number, month: number) {
  const db = await getDb();
  const from = new Date(Date.UTC(year, month - 1, 1, -8));
  const to = new Date(Date.UTC(year, month, 1, -8));
  return db
    .select({
      amount: orderSplits.amount,
      share: orderSplits.sharePermille,
      orderAmount: orders.amount,
      title: orders.itemTitle,
      paidAt: orders.paidAt,
      status: orders.status,
    })
    .from(orderSplits)
    .innerJoin(orders, eq(orders.id, orderSplits.orderId))
    .where(and(eq(orderSplits.memberId, memberId), inArray(orders.status, ["paid"]), gte(orders.paidAt, from), lt(orders.paidAt, to)))
    .orderBy(desc(orders.paidAt))
    .limit(300);
}
