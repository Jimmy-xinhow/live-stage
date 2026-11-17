import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { follows, liveSessions, menuItems, orders, performers, shows } from "./db/schema";
import { AREAS, areaBySlug } from "./areas";

/** 可被收錄的藝人：啟用中、有設定縣市、歌單至少一項 */
export const listable = and(eq(performers.status, "active"), eq(performers.accountType, "performer"), isNotNull(performers.city), sql`(${performers.bio} <> '' or exists (select 1 from "menu_items" m where m.performer_id = "performers"."id"))`);

/** 每個縣市的藝人數與正在表演數（首頁與 /area 用） */
export async function areaCounts() {
  const db = await getDb();
  const rows = await db
    .select({ city: performers.city, n: sql<number>`count(*)::int`, live: sql<number>`count(${performers.liveSessionId})::int` })
    .from(performers)
    .where(listable)
    .groupBy(performers.city);
  return AREAS.map((a) => {
    const r = rows.find((x) => x.city === a.slug);
    return { ...a, performers: Number(r?.n ?? 0), live: Number(r?.live ?? 0) };
  });
}

/** 正在表演（可指定縣市） */
export async function liveList(city?: string, limit = 24) {
  const db = await getDb();
  const conds = [listable];
  if (city) conds.push(eq(performers.city, city));
  const rows = await db
    .select({ p: performers, location: liveSessions.location, startedAt: liveSessions.startedAt })
    .from(performers)
    .innerJoin(liveSessions, eq(liveSessions.id, performers.liveSessionId))
    .where(and(...conds))
    .orderBy(desc(liveSessions.startedAt))
    .limit(limit);
  const sids = rows.map((r) => r.p.liveSessionId!) as string[];
  const waiting = sids.length
    ? await db
        .select({ sid: orders.sessionId, n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(inArray(orders.sessionId, sids), eq(orders.status, "paid"), eq(orders.queueStatus, "waiting")))
        .groupBy(orders.sessionId)
    : [];
  return rows.map((r) => ({
    slug: r.p.slug,
    name: r.p.displayName,
    avatar: r.p.avatarUrl,
    cover: r.p.coverUrl,
    color: r.p.themeColor,
    city: areaBySlug(r.p.city)?.name ?? "",
    location: r.location || r.p.district,
    startedAt: r.startedAt.toISOString(),
    waiting: Number(waiting.find((w) => w.sid === r.p.liveSessionId)?.n ?? 0),
  }));
}

/** 即將演出（預設未來 14 天） */
export async function upcomingShows(city?: string, days = 14, limit = 30) {
  const db = await getDb();
  const conds = [listable, gte(shows.startsAt, new Date()), lte(shows.startsAt, new Date(Date.now() + days * 86400_000))];
  if (city) conds.push(eq(performers.city, city));
  const rows = await db
    .select({ s: shows, p: performers })
    .from(shows)
    .innerJoin(performers, eq(performers.id, shows.performerId))
    .where(and(...conds))
    .orderBy(asc(shows.startsAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.s.id,
    startsAt: r.s.startsAt.toISOString(),
    location: r.s.location,
    note: r.s.note,
    slug: r.p.slug,
    name: r.p.displayName,
    avatar: r.p.avatarUrl,
    cover: r.p.coverUrl,
    color: r.p.themeColor,
    city: areaBySlug(r.p.city),
  }));
}

/** 縣市內的藝人清單：粉絲數、歌單數、最常被點的歌 */
export async function performersIn(city: string) {
  const db = await getDb();
  const list = await db.select().from(performers).where(and(listable, eq(performers.city, city)));
  if (!list.length) return [];
  const ids = list.map((p) => p.id);
  const [fanCounts, menuCounts, topSongs] = await Promise.all([
    db.select({ pid: follows.performerId, n: sql<number>`count(*)::int` }).from(follows).where(inArray(follows.performerId, ids)).groupBy(follows.performerId),
    db.select({ pid: menuItems.performerId, n: sql<number>`count(*)::int` }).from(menuItems).where(inArray(menuItems.performerId, ids)).groupBy(menuItems.performerId),
    db
      .select({ pid: menuItems.performerId, title: menuItems.title, n: menuItems.requestCount })
      .from(menuItems)
      .where(and(inArray(menuItems.performerId, ids), eq(menuItems.enabled, true)))
      .orderBy(desc(menuItems.requestCount), asc(menuItems.sort)),
  ]);
  return list
    .map((p) => ({
      slug: p.slug,
      name: p.displayName,
      avatar: p.avatarUrl,
      color: p.themeColor,
      bio: p.bio,
      district: p.district,
      live: !!p.liveSessionId,
      followers: Number(fanCounts.find((f) => f.pid === p.id)?.n ?? 0),
      songs: Number(menuCounts.find((m) => m.pid === p.id)?.n ?? 0),
      top: topSongs.filter((t) => t.pid === p.id).slice(0, 3).map((t) => t.title),
    }))
    .sort((a, b) => Number(b.live) - Number(a.live) || b.followers - a.followers);
}

/** 縣市熱門點歌（近 90 天）：每個地區頁都有不同的真實內容 */
export async function popularSongs(city: string, limit = 10) {
  const db = await getDb();
  const rows = await db
    .select({ title: orders.itemTitle, n: sql<number>`count(*)::int` })
    .from(orders)
    .innerJoin(performers, eq(performers.id, orders.performerId))
    .where(and(eq(performers.city, city), eq(orders.status, "paid"), eq(orders.kind, "request"), gte(orders.paidAt, new Date(Date.now() - 90 * 86400_000))))
    .groupBy(orders.itemTitle)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows.filter((r) => r.title).map((r) => ({ title: r.title!, count: Number(r.n) }));
}

/** sitemap 用：可收錄的藝人頁 */
export async function indexablePerformers() {
  const db = await getDb();
  return db.select({ slug: performers.slug, city: performers.city, createdAt: performers.createdAt }).from(performers).where(listable);
}
