import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { fans, follows, liveSessions, orders, performers, shows, type Performer } from "./db/schema";
import type { LineProfile } from "./line";
import { multicast, pushMessage } from "./line";
import { applyPoints, canAcceptOrders } from "./billing";
import { env } from "./env";

export async function upsertFan(profile: LineProfile) {
  const db = await getDb();
  const [f] = await db
    .insert(fans)
    .values({ lineUserId: profile.userId, name: profile.name.slice(0, 60), avatarUrl: profile.picture ?? null })
    .onConflictDoUpdate({ target: fans.lineUserId, set: { name: profile.name.slice(0, 60), avatarUrl: profile.picture ?? null } })
    .returning();
  return f;
}

export async function getFan(id: string | null) {
  if (!id) return null;
  const db = await getDb();
  return (await db.select().from(fans).where(eq(fans.id, id)))[0] ?? null;
}

export async function getFanByLine(lineUserId: string) {
  const db = await getDb();
  return (await db.select().from(fans).where(eq(fans.lineUserId, lineUserId)))[0] ?? null;
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

export async function setNotify(performerId: string, fanId: string, notifyLive: boolean) {
  const db = await getDb();
  await db.update(follows).set({ notifyLive }).where(and(eq(follows.performerId, performerId), eq(follows.fanId, fanId)));
}

/* ────────────── 觀眾：我的追蹤 ────────────── */

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

async function followerLineIds(performerId: string, fanIds?: string[]) {
  const db = await getDb();
  const conds = [eq(follows.performerId, performerId), eq(follows.notifyLive, true)];
  if (fanIds) conds.push(inArray(follows.fanId, fanIds.length ? fanIds : ["00000000-0000-0000-0000-000000000000"]));
  return (await db.select({ l: fans.lineUserId }).from(follows).innerJoin(fans, eq(fans.id, follows.fanId)).where(and(...conds))).map((r) => r.l);
}

export const fmtShowTime = (d: Date) =>
  d.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export async function createShow(p: Performer, input: { startsAt: Date; location: string; note: string }, notify: boolean) {
  const db = await getDb();
  const [s] = await db.insert(shows).values({ performerId: p.id, ...input }).returning();
  if (!notify) return { show: s, notified: 0 };
  const ids = await followerLineIds(p.id);
  if (!ids.length) return { show: s, notified: 0 };
  await multicast(ids, [
    { type: "text", text: `📅 ${p.displayName} 演出預告\n${fmtShowTime(input.startsAt)}\n📍 ${input.location}${input.note ? `\n${input.note}` : ""}\n先看歌單：${env.baseUrl}/p/${p.slug}` },
  ]);
  const cost = ids.length * env.billing.liveNotifyCents;
  if (cost) await applyPoints(db, p.id, -cost, "broadcast", { note: `演出預告 ${ids.length} 位粉絲` });
  await db.update(shows).set({ notifiedCount: ids.length }).where(eq(shows.id, s.id));
  return { show: s, notified: ids.length };
}

/* ────────────── 藝人：粉絲名單與分群 ────────────── */

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
export async function messageFans(p: Performer, target: { segment?: Segment | "all"; fanId?: string }, text: string) {
  const db = await getDb();
  const list = await fanList(p.id);
  const picked = target.fanId ? list.filter((f) => f.id === target.fanId) : target.segment && target.segment !== "all" ? list.filter((f) => f.seg.includes(target.segment as Segment)) : list;
  if (!picked.length) throw new FanError("沒有符合的粉絲");
  // 群發每天最多 3 次，避免洗版讓粉絲封鎖官方帳號
  if (!target.fanId) {
    const since = new Date(Date.now() - 24 * 3600_000);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(sql`point_ledger`)
      .where(sql`performer_id = ${p.id} and reason = 'broadcast' and created_at > ${since.toISOString()}`);
    if (Number(n) >= 3) throw new FanError("今天已群發 3 次，明天再發");
  }
  const ids = target.fanId
    ? (await db.select({ l: fans.lineUserId }).from(fans).where(eq(fans.id, target.fanId))).map((r) => r.l)
    : await followerLineIds(p.id, picked.map((f) => f.id));
  if (!ids.length) throw new FanError("這些粉絲關閉了通知");
  const body = `💌 ${p.displayName}：\n${text}\n\n${env.baseUrl}/p/${p.slug}`;
  if (ids.length === 1) await pushMessage(ids[0], [{ type: "text", text: body }]);
  else await multicast(ids, [{ type: "text", text: body }]);
  const cost = ids.length * env.billing.liveNotifyCents;
  if (cost) await applyPoints(db, p.id, -cost, "broadcast", { note: target.fanId ? "一對一感謝" : `粉絲訊息 ${ids.length} 人` });
  return { sent: ids.length };
}
