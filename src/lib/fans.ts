import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { fans, follows, liveSessions, orders, performers, shows, type Performer } from "./db/schema";
import { applyPoints, canAcceptOrders } from "./billing";
import { track } from "./usage";
import { createFanSession, getFanId } from "./session";
import { env } from "./env";

export async function getFan(id: string | null) {
  if (!id) return null;
  const db = await getDb();
  return (await db.select().from(fans).where(eq(fans.id, id)))[0] ?? null;
}

export async function isFollowing(performerId: string, fanId: string | null) {
  if (!fanId) return false;
  const db = await getDb();
  return (await db.select().from(follows).where(and(eq(follows.performerId, performerId), eq(follows.fanId, fanId)))).length > 0;
}

export async function setFollow(performerId: string, fanId: string, on: boolean) {
  const db = await getDb();
  if (on) await db.insert(follows).values({ performerId, fanId }).onConflictDoNothing();
  else await db.delete(follows).where(and(eq(follows.performerId, performerId), eq(follows.fanId, fanId)));
}

export async function myFollowing(fanId: string) {
  const db = await getDb();
  const rows = await db
    .select({ p: performers, notifyLive: follows.notifyLive, followedAt: follows.createdAt })
    .from(follows)
    .innerJoin(performers, eq(performers.id, follows.performerId))
    .where(and(eq(follows.fanId, fanId), eq(performers.status, "active")));
  const ids = rows.map((r) => r.p.id);
  const sessionIds = rows.map((r) => r.p.liveSessionId).filter(Boolean) as string[];
  const [sessions, upcoming, waiting] = await Promise.all([
    sessionIds.length ? db.select().from(liveSessions).where(inArray(liveSessions.id, sessionIds)) : [],
    ids.length ? db.select().from(shows).where(and(inArray(shows.performerId, ids), gte(shows.startsAt, new Date()))).orderBy(asc(shows.startsAt)) : [],
    sessionIds.length
      ? db
          .select({ sid: orders.sessionId, n: sql<number>`count(*)::int` })
          .from(orders)
          .where(and(inArray(orders.sessionId, sessionIds), eq(orders.status, "paid"), eq(orders.queueStatus, "waiting")))
          .groupBy(orders.sessionId)
      : [],
  ]);
  const list = rows.map((r) => {
    const s = sessions.find((x) => x.id === r.p.liveSessionId);
    const next = upcoming.find((x) => x.performerId === r.p.id);
    return {
      slug: r.p.slug,
      name: r.p.displayName,
      avatar: r.p.avatarUrl,
      color: r.p.themeColor,
      notifyLive: r.notifyLive,
      live: s ? { location: s.location, startedAt: s.startedAt.toISOString(), waiting: Number(waiting.find((w) => w.sid === s.id)?.n ?? 0) } : null,
      accepting: canAcceptOrders(r.p.pointsCents),
      nextShow: next ? { startsAt: next.startsAt.toISOString(), location: next.location, note: next.note } : null,
    };
  });
  // 正在表演的排最前，其次是最近有預告的
  return list.sort((a, b) => Number(!!b.live) - Number(!!a.live) || (a.nextShow?.startsAt ?? "9").localeCompare(b.nextShow?.startsAt ?? "9"));
}

export async function myOrders(fanId: string, limit = 20) {
  const db = await getDb();
  return db
    .select({ tradeNo: orders.tradeNo, itemTitle: orders.itemTitle, amount: orders.amount, status: orders.status, queueStatus: orders.queueStatus, reply: orders.reply, createdAt: orders.createdAt, name: performers.displayName, slug: performers.slug })
    .from(orders)
    .innerJoin(performers, eq(performers.id, orders.performerId))
    .where(and(eq(orders.fanId, fanId), inArray(orders.status, ["paid", "awaiting"])))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

/** 所有正在表演的藝人（給還沒追蹤任何人的觀眾探索） */
export async function liveNow(limit = 20) {
  const db = await getDb();
  return db
    .select({ slug: performers.slug, name: performers.displayName, avatar: performers.avatarUrl, color: performers.themeColor, location: liveSessions.location, startedAt: liveSessions.startedAt })
    .from(performers)
    .innerJoin(liveSessions, eq(liveSessions.id, performers.liveSessionId))
    .where(eq(performers.status, "active"))
    .orderBy(desc(liveSessions.startedAt))
    .limit(limit);
}

/* ────────────── 藝人：演出預告 ────────────── */

export async function nextShow(performerId: string) {
  const db = await getDb();
  return (await db.select().from(shows).where(and(eq(shows.performerId, performerId), gte(shows.startsAt, new Date()))).orderBy(asc(shows.startsAt)).limit(1))[0] ?? null;
}

export const fmtShowTime = (d: Date) =>
  d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export async function createShow(p: Performer, input: { startsAt: Date; location: string; note: string }) {
  const db = await getDb();
  const [s] = await db
    .insert(shows)
    .values({ performerId: p.id, startsAt: input.startsAt, location: input.location, note: input.note })
    .returning();
  track("show_add", p.id);
  return { show: s };
}

export type Segment = "new" | "regular" | "big" | "sleeping";
export const SEGMENT_LABEL: Record<Segment, string> = { new: "新粉（30 天內）", regular: "常客（支持 3 次以上）", big: "大粉（累計 NT$1,000 以上）", sleeping: "沉睡（60 天沒來）" };

export async function fanList(performerId: string) {
  const db = await getDb();
  const support = db
    .select({
      fanId: orders.fanId,
      total: sql<number>`sum(${orders.amount})::int`.as("total"),
      cnt: sql<number>`count(*)::int`.as("cnt"),
      last: sql<Date>`max(${orders.paidAt})`.as("last"),
    })
    .from(orders)
    .where(and(eq(orders.performerId, performerId), eq(orders.status, "paid")))
    .groupBy(orders.fanId)
    .as("s");
  const rows = await db
    .select({ id: fans.id, name: fans.name, avatar: fans.avatarUrl, followedAt: follows.createdAt, notifyLive: follows.notifyLive, total: support.total, cnt: support.cnt, last: support.last })
    .from(follows)
    .innerJoin(fans, eq(fans.id, follows.fanId))
    .leftJoin(support, eq(support.fanId, fans.id))
    .where(eq(follows.performerId, performerId))
    .orderBy(desc(sql`coalesce(${support.total},0)`), desc(follows.createdAt));
  const now = Date.now();
  return rows.map((r) => {
    const total = Number(r.total ?? 0);
    const cnt = Number(r.cnt ?? 0);
    const last = r.last ? new Date(r.last) : null;
    const seg: Segment[] = [];
    if (now - r.followedAt.getTime() < 30 * 86400_000) seg.push("new");
    if (cnt >= 3) seg.push("regular");
    if (total >= 1000) seg.push("big");
    if (now - (last ?? r.followedAt).getTime() > 60 * 86400_000) seg.push("sleeping");
    return { id: r.id, name: r.name || "粉絲", avatar: r.avatar, followedAt: r.followedAt.toISOString(), notifyLive: r.notifyLive, total, cnt, last: last?.toISOString() ?? null, seg };
  });
}

export async function fanHistory(performerId: string, fanId: string) {
  const db = await getDb();
  return db
    .select({ itemTitle: orders.itemTitle, amount: orders.amount, message: orders.message, paidAt: orders.paidAt })
    .from(orders)
    .where(and(eq(orders.performerId, performerId), eq(orders.fanId, fanId), eq(orders.status, "paid")))
    .orderBy(desc(orders.paidAt))
    .limit(30);
}

export class FanError extends Error {}

/** 藝人透過平台官方帳號傳訊息給粉絲（整群、分群或單一粉絲），依人數扣點 */

/**
 * 拿到這台裝置的觀眾身分，沒有就當場建一個。
 *
 * 這是「不需要登入」的核心：任何需要認得人的動作（簽到、許願、投票、
 * 遊戲裡的我）都呼叫這個，而不是先擋下來要求登入。
 * 只能在路由處理器或 server action 裡呼叫，因為它會寫 cookie。
 */
export async function ensureFanId(): Promise<string> {
  const existing = await getFanId();
  if (existing) {
    const db = await getDb();
    const [f] = await db.select({ id: fans.id }).from(fans).where(eq(fans.id, existing));
    if (f) return f.id;
  }
  const db = await getDb();
  const [fan] = await db.insert(fans).values({}).returning();
  await createFanSession(fan.id);
  return fan.id;
}
