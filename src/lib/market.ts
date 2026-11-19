import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { checkins, fans, follows, inquiries, inquiryTargets, liveSessions, menuItems, orders, performers, promotions, type Performer } from "./db/schema";
import { listable } from "./discover";
import { areaBySlug } from "./areas";
import { actName } from "./acts";
import { applyPoints } from "./billing";
import { env } from "./env";
import { nt } from "./format";
import { reportError } from "./errors";

export class MarketError extends Error {}

/** 推薦版位每日點數（待定價，可用環境變數調整）；每個地區×類型的搜尋置頂只有 2 格 */
export const PROMO = {
  search: { name: "搜尋結果置頂", daily: Number(process.env.PROMO_SEARCH_POINTS ?? "30"), cap: 2 },
  home: { name: "首頁推薦表演者", daily: Number(process.env.PROMO_HOME_POINTS ?? "50"), cap: 4 },
} as const;
export type PromoSlot = keyof typeof PROMO;

export type Card = {
  slug: string; name: string; avatar: string | null; cover: string | null; act: string; actName: string; city: string; district: string;
  bio: string; genres: string; priceFrom: number | null; bookable: boolean; live: boolean; liveAt: string; followers: number; shows: number; songs: number; promoted: boolean; promoId: string | null;
};

async function toCards(list: Performer[], promos: { id: string; performerId: string }[] = []): Promise<Card[]> {
  if (!list.length) return [];
  const db = await getDb();
  const ids = list.map((p) => p.id);
  const [fc, sc, mc, live] = await Promise.all([
    db.select({ pid: follows.performerId, n: sql<number>`count(*)::int` }).from(follows).where(inArray(follows.performerId, ids)).groupBy(follows.performerId),
    db.select({ pid: liveSessions.performerId, n: sql<number>`count(*)::int` }).from(liveSessions).where(inArray(liveSessions.performerId, ids)).groupBy(liveSessions.performerId),
    db.select({ pid: menuItems.performerId, n: sql<number>`count(*)::int` }).from(menuItems).where(inArray(menuItems.performerId, ids)).groupBy(menuItems.performerId),
    db.select({ id: liveSessions.id, location: liveSessions.location }).from(liveSessions).where(inArray(liveSessions.id, list.map((p) => p.liveSessionId).filter(Boolean) as string[])),
  ]);
  const n = (rows: { pid: string; n: number }[], id: string) => Number(rows.find((r) => r.pid === id)?.n ?? 0);
  return list.map((p) => ({
    slug: p.slug, name: p.displayName, avatar: p.avatarUrl, cover: p.coverUrl, act: p.actType, actName: actName(p.actType),
    city: areaBySlug(p.city)?.short ?? "", district: p.district, bio: p.bio, genres: p.genres, priceFrom: p.priceFrom, bookable: p.bookable,
    live: !!p.liveSessionId, liveAt: live.find((l) => l.id === p.liveSessionId)?.location ?? "",
    followers: n(fc, p.id), shows: n(sc, p.id), songs: n(mc, p.id),
    promoted: promos.some((x) => x.performerId === p.id), promoId: promos.find((x) => x.performerId === p.id)?.id ?? null,
  }));
}

async function activePromos(slot: PromoSlot, city?: string, act?: string) {
  const db = await getDb();
  const now = new Date();
  const conds = [eq(promotions.slot, slot), lte(promotions.startsAt, now), gt(promotions.endsAt, now)];
  if (city) conds.push(eq(promotions.city, city));
  if (act) conds.push(eq(promotions.actType, act));
  return db.select().from(promotions).where(and(...conds)).orderBy(promotions.createdAt).limit(PROMO[slot].cap * 3);
}

/** 找表演者：付費推薦最多 2 位置頂（標示），其餘依演出中、場次、粉絲排序 */
export async function searchPerformers(f: { city?: string; act?: string; q?: string; live?: boolean; bookable?: boolean }) {
  const db = await getDb();
  const conds = [listable];
  if (f.city) conds.push(eq(performers.city, f.city));
  if (f.act) conds.push(eq(performers.actType, f.act));
  if (f.live) conds.push(sql`${performers.liveSessionId} is not null`);
  if (f.bookable) conds.push(eq(performers.bookable, true));
  if (f.q) conds.push(sql`(${performers.displayName} ilike ${"%" + f.q + "%"} or ${performers.genres} ilike ${"%" + f.q + "%"} or ${performers.bio} ilike ${"%" + f.q + "%"})`);
  const list = await db.select().from(performers).where(and(...conds)).limit(60);
  const promos = f.city && f.act ? await activePromos("search", f.city, f.act) : [];
  const shown = dedupe(promos).filter((x) => list.some((p) => p.id === x.performerId)).slice(0, PROMO.search.cap);
  const cards = await toCards(list, shown);
  await bumpImpressions(shown.map((x) => x.id));
  return cards.sort((a, b) => Number(b.promoted) - Number(a.promoted) || Number(b.live) - Number(a.live) || b.shows - a.shows || b.followers - a.followers);
}

export async function homeFeatured(city?: string) {
  const db = await getDb();
  const shown = dedupe(await activePromos("home", city)).slice(0, PROMO.home.cap);
  if (!shown.length) return [];
  const list = await db.select().from(performers).where(and(listable, inArray(performers.id, shown.map((x) => x.performerId))));
  const live = shown.filter((x) => list.some((p) => p.id === x.performerId));
  await bumpImpressions(live.map((x) => x.id));
  return toCards(list, live);
}

/** 同一位表演者在同個版位只佔一格 */
function dedupe<T extends { performerId: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.performerId) ? false : (seen.add(r.performerId), true)));
}

/** 版位曝光與點擊：失敗不影響頁面 */
export async function bumpImpressions(ids: string[]) {
  if (!ids.length) return;
  const db = await getDb();
  try {
    await db.update(promotions).set({ impressions: sql`${promotions.impressions} + 1` }).where(inArray(promotions.id, ids));
  } catch (e) {
    reportError("[promo impressions]", e);
  }
}

export async function bumpClick(id: string) {
  const db = await getDb();
  try {
    await db.update(promotions).set({ clicks: sql`${promotions.clicks} + 1` }).where(eq(promotions.id, id));
  } catch (e) {
    reportError("[promo click]", e);
  }
}

/** 刊登期間的成效：曝光、點擊、新增追蹤與邀約 */
export async function promotionStats(rows: { id: string; performerId: string; startsAt: Date; endsAt: Date; impressions: number; clicks: number }[]) {
  if (!rows.length) return [];
  const db = await getDb();
  return Promise.all(
    rows.map(async (r) => {
      const until = new Date(Math.min(r.endsAt.getTime(), Date.now()));
      const [[f], [q]] = await Promise.all([
        db.select({ n: sql<number>`count(*)::int` }).from(follows).where(and(eq(follows.performerId, r.performerId), gte(follows.createdAt, r.startsAt), lte(follows.createdAt, until))),
        db
          .select({ n: sql<number>`count(*)::int` })
          .from(inquiryTargets)
          .innerJoin(inquiries, eq(inquiries.id, inquiryTargets.inquiryId))
          .where(and(eq(inquiryTargets.performerId, r.performerId), gte(inquiries.createdAt, r.startsAt), lte(inquiries.createdAt, until))),
      ]);
      return { id: r.id, follows: Number(f.n), inquiries: Number(q.n) };
    }),
  );
}

/** 每個類型的人數（首頁「依類型」與收錄判斷） */
export async function actCounts(city?: string) {
  const db = await getDb();
  const conds = [listable];
  if (city) conds.push(eq(performers.city, city));
  const rows = await db.select({ act: performers.actType, n: sql<number>`count(*)::int` }).from(performers).where(and(...conds)).groupBy(performers.actType);
  return Object.fromEntries(rows.map((r) => [r.act, Number(r.n)])) as Record<string, number>;
}

/** 平台自動累積、表演者不能改的演出紀錄 */
export async function trackRecord(p: Performer) {
  const db = await getDb();
  const [[s], [r], [f], [c], t] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(liveSessions).where(eq(liveSessions.performerId, p.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.performerId, p.id), eq(orders.status, "paid"), eq(orders.kind, "request"))),
    db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.performerId, p.id)),
    db.select({ n: sql<number>`count(*)::int` }).from(checkins).where(eq(checkins.performerId, p.id)),
    db.select({ st: inquiryTargets.status, n: sql<number>`count(*)::int` }).from(inquiryTargets).where(eq(inquiryTargets.performerId, p.id)).groupBy(inquiryTargets.status),
  ]);
  const total = t.reduce((a, x) => a + Number(x.n), 0);
  const replied = t.filter((x) => x.st !== "new").reduce((a, x) => a + Number(x.n), 0);
  return { shows: Number(s.n), requests: Number(r.n), followers: Number(f.n), checkins: Number(c.n), replyRate: total ? Math.round((replied / total) * 100) : null };
}

/* ────────────── 付費曝光 ────────────── */

export async function buyPromotion(p: Performer, slot: PromoSlot, days: number) {
  if (!p.city) throw new MarketError("請先在「對外頁面」選擇演出縣市");
  if (![7, 14, 30].includes(days)) throw new MarketError("天數不正確");
  const db = await getDb();
  const cfg = PROMO[slot];
  const now = new Date();
  const act = slot === "search" ? p.actType : p.actType;
  const taken = await db
    .select({ pid: promotions.performerId })
    .from(promotions)
    .where(and(eq(promotions.slot, slot), eq(promotions.city, p.city), ...(slot === "search" ? [eq(promotions.actType, act)] : []), gt(promotions.endsAt, now)));
  if (taken.some((t) => t.pid === p.id)) throw new MarketError("這個版位你已經在刊登中");
  if (new Set(taken.map((t) => t.pid)).size >= cfg.cap) throw new MarketError(`這個版位目前滿了（每個地區只有 ${cfg.cap} 格），到期後會開放`);
  const cost = cfg.daily * days * 100;
  if (p.pointsCents < cost) throw new MarketError(`點數不足，需要 ${cfg.daily * days} 點`);
  return db.transaction(async (tx) => {
    await applyPoints(tx, p.id, -cost, "promo", { note: `${cfg.name} ${days} 天` });
    const [row] = await tx.insert(promotions).values({ performerId: p.id, slot, city: p.city!, actType: act, startsAt: now, endsAt: new Date(now.getTime() + days * 86400_000), costCents: cost }).returning();
    return row;
  });
}

export async function myPromotions(performerId: string) {
  const db = await getDb();
  return db.select().from(promotions).where(eq(promotions.performerId, performerId)).orderBy(desc(promotions.createdAt)).limit(20);
}

/* ────────────── 邀約媒合（平台只轉達，不經手款項） ────────────── */

export type InquiryInput = { contactName: string; occasion: string; actType: string | null; eventDate: string; timeText: string; city: string; place: string; guests: string; budget: string; note: string; to: string | null; broadcast: boolean };

export async function createInquiry(fanId: string, i: InquiryInput) {
  const db = await getDb();
  const targets: Performer[] = [];
  if (i.to) {
    const [p] = await db.select().from(performers).where(and(eq(performers.slug, i.to), eq(performers.status, "active")));
    if (p && p.bookable) targets.push(p);
  }
  if (i.broadcast || !targets.length) {
    const conds = [listable, eq(performers.bookable, true), sql`(${performers.city} = ${i.city} or ${performers.serviceAreas} @> ${JSON.stringify([i.city])}::jsonb)`];
    if (i.actType) conds.push(eq(performers.actType, i.actType));
    const more = await db.select().from(performers).where(and(...conds)).limit(12);
    for (const p of more) if (targets.length < 5 && !targets.some((t) => t.id === p.id)) targets.push(p);
  }
  if (!targets.length) throw new MarketError("這個地區目前還沒有符合的表演者，換個類型或地區試試");
  const [inq] = await db
    .insert(inquiries)
    .values({ fanId, contactName: i.contactName, occasion: i.occasion, actType: i.actType, eventDate: i.eventDate, timeText: i.timeText, city: i.city, place: i.place, guests: i.guests, budget: i.budget, note: i.note })
    .returning();
  await db.insert(inquiryTargets).values(targets.map((p) => ({ inquiryId: inq.id, performerId: p.id })));
  const area = areaBySlug(i.city)?.name ?? "";
  // 原本這裡推播給被邀約的表演者。沒有推播之後，邀約出現在後台的待辦清單。
  void area;
  return { id: inq.id, names: targets.map((p) => p.displayName) };
}

export async function inquiriesFor(performerId: string) {
  const db = await getDb();
  const rows = await db
    .select({ i: inquiries, t: inquiryTargets })
    .from(inquiryTargets)
    .innerJoin(inquiries, eq(inquiries.id, inquiryTargets.inquiryId))
    .where(and(eq(inquiryTargets.performerId, performerId), gte(inquiries.createdAt, new Date(Date.now() - 90 * 86400_000))))
    .orderBy(desc(inquiries.createdAt));
  return rows.map((r) => ({ ...r.i, createdAt: r.i.createdAt.toISOString(), cityName: areaBySlug(r.i.city)?.name ?? "", status: r.t.status, quoteAmount: r.t.quoteAmount, quoteNote: r.t.quoteNote }));
}

export async function replyInquiry(p: Performer, inquiryId: string, r: { decline?: boolean; amount?: number; note?: string }) {
  const db = await getDb();
  const [row] = await db
    .update(inquiryTargets)
    .set(r.decline ? { status: "declined", repliedAt: new Date() } : { status: "quoted", quoteAmount: r.amount ?? null, quoteNote: (r.note ?? "").slice(0, 300), repliedAt: new Date() })
    .where(and(eq(inquiryTargets.inquiryId, inquiryId), eq(inquiryTargets.performerId, p.id)))
    .returning();
  if (!row) throw new MarketError("找不到這筆邀約");
  if (!r.decline) {
    const [q] = await db.select({ line: fans.lineUserId, occasion: inquiries.occasion, date: inquiries.eventDate }).from(inquiries).innerJoin(fans, eq(fans.id, inquiries.fanId)).where(eq(inquiries.id, inquiryId));
    // 報價回覆原本會推播給邀請人；現在他回到邀約頁就看得到
    void q;
  }
  return row;
}

/** 邀請人在活動日之後留評價：只有拿到報價的那一筆可以評，一筆評一次 */
export async function reviewInquiry(fanId: string, inquiryId: string, performerSlug: string, rating: number, review: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new MarketError("請給 1 到 5 顆星");
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.slug, performerSlug));
  if (!p) throw new MarketError("找不到這位表演者");
  const [inq] = await db.select().from(inquiries).where(and(eq(inquiries.id, inquiryId), eq(inquiries.fanId, fanId)));
  if (!inq) throw new MarketError("找不到這筆邀約");
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  if (inq.eventDate > today) throw new MarketError("活動結束後才能評價");
  const [row] = await db
    .update(inquiryTargets)
    .set({ rating, review: review.trim().slice(0, 300), reviewedAt: new Date() })
    .where(and(eq(inquiryTargets.inquiryId, inquiryId), eq(inquiryTargets.performerId, p.id), eq(inquiryTargets.status, "quoted"), isNull(inquiryTargets.reviewedAt)))
    .returning();
  if (!row) throw new MarketError("這筆邀約還不能評價，或你已經評過了");
  // 評價原本會推播給表演者；現在作品頁上直接看得到
  return row;
}

/** 作品頁的評價（只顯示有留言的，最多 10 筆） */
export async function reviewsOf(performerId: string) {
  const db = await getDb();
  const rows = await db
    .select({ rating: inquiryTargets.rating, review: inquiryTargets.review, at: inquiryTargets.reviewedAt, name: inquiries.contactName, occasion: inquiries.occasion })
    .from(inquiryTargets)
    .innerJoin(inquiries, eq(inquiries.id, inquiryTargets.inquiryId))
    .where(and(eq(inquiryTargets.performerId, performerId), isNotNull(inquiryTargets.reviewedAt), eq(inquiryTargets.reviewHidden, false)))
    .orderBy(desc(inquiryTargets.reviewedAt))
    .limit(10);
  const all = rows.map((r) => Number(r.rating ?? 0)).filter(Boolean);
  return {
    count: all.length,
    average: all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : null,
    items: rows.filter((r) => r.review).map((r) => ({ rating: Number(r.rating), review: r.review!, name: r.name, occasion: r.occasion, at: r.at!.toISOString() })),
  };
}

export async function myInquiries(fanId: string) {
  const db = await getDb();
  const rows = await db
    .select({ i: inquiries, t: inquiryTargets, name: performers.displayName, slug: performers.slug })
    .from(inquiries)
    .innerJoin(inquiryTargets, eq(inquiryTargets.inquiryId, inquiries.id))
    .innerJoin(performers, eq(performers.id, inquiryTargets.performerId))
    .where(eq(inquiries.fanId, fanId))
    .orderBy(desc(inquiries.createdAt))
    .limit(40);
  return rows.map((r) => ({ id: r.i.id, occasion: r.i.occasion, eventDate: r.i.eventDate, name: r.name, slug: r.slug, status: r.t.status, quoteAmount: r.t.quoteAmount, quoteNote: r.t.quoteNote, reviewed: !!r.t.reviewedAt }));
}
