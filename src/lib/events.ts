import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { eventPerformers, events, fans, follows, performers, promotions, type EventRow, type Performer } from "./db/schema";
import { areaBySlug } from "./areas";
import { applyPoints } from "./billing";
import { multicast, pushMessage } from "./line";
import { env } from "./env";
import { fmtTaipei } from "./format";
import { bumpImpressions } from "./market";

export class EventError extends Error {}

/** 活動曝光版位（暫定價，可用環境變數調整） */
export const EVENT_PROMO = {
  event_top: { name: "活動列表置頂", daily: Number(process.env.PROMO_EVENT_POINTS ?? "40"), cap: 2 },
  event_home: { name: "首頁活動推薦", daily: Number(process.env.PROMO_EVENT_HOME_POINTS ?? "60"), cap: 3 },
} as const;
export type EventSlot = keyof typeof EVENT_PROMO;

export type EventInput = {
  title: string; city: string; place: string; address: string; startsAt: string; endsAt: string | null;
  description: string; priceText: string; link: string; coverUrl: string | null; guestActs: string; performerSlugs: string[]; notifyFans: boolean; lat?: string; lng?: string;
};

const clean = (s: string, n: number) => s.trim().slice(0, n);
/** 經緯度可不填；填了才蓋掉縣市中心 */
const coords = (i: EventInput) => ({
  lat: i.lat && Math.abs(Number(i.lat)) <= 90 ? i.lat.trim() : null,
  lng: i.lng && Math.abs(Number(i.lng)) <= 180 ? i.lng.trim() : null,
});

export async function createEvent(org: Performer, i: EventInput) {
  if (!i.title.trim()) throw new EventError("請填活動名稱");
  if (!areaBySlug(i.city)) throw new EventError("請選縣市");
  const start = new Date(i.startsAt);
  if (!i.startsAt || Number.isNaN(start.getTime())) throw new EventError("請填活動時間");
  const db = await getDb();
  const [row] = await db
    .insert(events)
    .values({
      organizerId: org.id, title: clean(i.title, 60), city: i.city, place: clean(i.place, 60), address: clean(i.address, 100),
      startsAt: start, endsAt: i.endsAt ? new Date(i.endsAt) : null, description: clean(i.description, 800), priceText: clean(i.priceText, 40),
      link: clean(i.link, 300), coverUrl: i.coverUrl || null, guestActs: clean(i.guestActs, 200), notifyFans: i.notifyFans,
      ...coords(i),
    })
    .returning();
  await tagPerformers(org, row, i.performerSlugs);
  return row;
}

export async function updateEvent(org: Performer, id: string, i: EventInput) {
  const db = await getDb();
  const ev = await ownEvent(org, id);
  const start = new Date(i.startsAt);
  const [row] = await db
    .update(events)
    .set({
      title: clean(i.title, 60), city: i.city, place: clean(i.place, 60), address: clean(i.address, 100),
      startsAt: Number.isNaN(start.getTime()) ? ev.startsAt : start, endsAt: i.endsAt ? new Date(i.endsAt) : null,
      description: clean(i.description, 800), priceText: clean(i.priceText, 40), link: clean(i.link, 300), coverUrl: i.coverUrl || null,
      guestActs: clean(i.guestActs, 200), notifyFans: i.notifyFans, ...coords(i),
    })
    .where(eq(events.id, id))
    .returning();
  await tagPerformers(org, row, i.performerSlugs);
  return row;
}

export async function cancelEvent(org: Performer, id: string) {
  const db = await getDb();
  await ownEvent(org, id);
  await db.update(events).set({ status: "cancelled" }).where(eq(events.id, id));
}

async function ownEvent(org: Performer, id: string) {
  const db = await getDb();
  const [ev] = await db.select().from(events).where(and(eq(events.id, id), eq(events.organizerId, org.id)));
  if (!ev) throw new EventError("找不到這場活動");
  return ev;
}

/** 標記平台上的表演者：送出邀請，對方確認後才公開顯示 */
async function tagPerformers(org: Performer, ev: EventRow, slugs: string[]) {
  const db = await getDb();
  const wanted = [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  const current = await db.select().from(eventPerformers).where(eq(eventPerformers.eventId, ev.id));
  const list = wanted.length ? await db.select().from(performers).where(and(inArray(performers.slug, wanted), eq(performers.accountType, "performer"))) : [];
  const keep = list.map((p) => p.id);
  const gone = current.filter((c) => !keep.includes(c.performerId));
  if (gone.length) await db.delete(eventPerformers).where(and(eq(eventPerformers.eventId, ev.id), inArray(eventPerformers.performerId, gone.map((g) => g.performerId))));
  for (const p of list) {
    if (current.some((c) => c.performerId === p.id)) continue;
    await db.insert(eventPerformers).values({ eventId: ev.id, performerId: p.id });
    if (p.lineUserId)
      await pushMessage(p.lineUserId, [
        {
          type: "text",
          text: `${org.displayName} 把你列在活動「${ev.title}」的演出名單\n${fmtWhen(ev.startsAt)}・${ev.place}\n確認後才會公開顯示你的名字。`,
          quickReply: {
            items: [
              { type: "action", action: { type: "postback", label: "我會演出", data: `event_yes:${ev.id}`, displayText: `我會演出「${ev.title}」` } },
              { type: "action", action: { type: "postback", label: "不是我", data: `event_no:${ev.id}`, displayText: `不會演出「${ev.title}」` } },
            ],
          },
        },
      ]).catch(() => null);
  }
}

export const fmtWhen = (d: Date | string) => fmtTaipei(d);

/** 表演者確認被標記；確認時若主辦有勾選，通知表演者的粉絲（費用由主辦出） */
export async function respondTag(p: Performer, eventId: string, accept: boolean) {
  const db = await getDb();
  const [tag] = await db.select().from(eventPerformers).where(and(eq(eventPerformers.eventId, eventId), eq(eventPerformers.performerId, p.id)));
  if (!tag) throw new EventError("找不到這場活動");
  if (!accept) {
    await db.update(eventPerformers).set({ status: "declined" }).where(and(eq(eventPerformers.eventId, eventId), eq(eventPerformers.performerId, p.id)));
    return { notified: 0 };
  }
  const [ev] = await db.select().from(events).where(eq(events.id, eventId));
  await db.update(eventPerformers).set({ status: "confirmed" }).where(and(eq(eventPerformers.eventId, eventId), eq(eventPerformers.performerId, p.id)));
  if (!ev || !ev.notifyFans || tag.notified) return { notified: 0 };
  const rows = await db
    .select({ line: fans.lineUserId })
    .from(follows)
    .innerJoin(fans, eq(fans.id, follows.fanId))
    .where(and(eq(follows.performerId, p.id), eq(follows.notifyLive, true)));
  const ids = rows.map((r) => r.line).filter(Boolean);
  if (!ids.length) return { notified: 0 };
  await multicast(ids, [{ type: "text", text: `${p.displayName} 要在「${ev.title}」演出\n${fmtWhen(ev.startsAt)}・${ev.place}\n${env.baseUrl}/e/${ev.id}` }]).catch(() => null);
  const cost = ids.length * env.billing.liveNotifyCents;
  if (cost) await applyPoints(db, ev.organizerId, -cost, "event_notify", { note: `活動通知 ${ids.length} 位粉絲` });
  await db.update(eventPerformers).set({ notified: ids.length }).where(and(eq(eventPerformers.eventId, eventId), eq(eventPerformers.performerId, p.id)));
  return { notified: ids.length };
}

export type EventCard = {
  id: string; title: string; city: string; place: string; startsAt: string; priceText: string; cover: string | null;
  organizer: string; organizerSlug: string; acts: { slug: string; name: string }[]; guestActs: string; promoted: boolean; promoId: string | null;
};

async function toCards(list: EventRow[], promos: { id: string; eventId: string | null }[] = []): Promise<EventCard[]> {
  if (!list.length) return [];
  const db = await getDb();
  const ids = list.map((e) => e.id);
  const [tags, orgs] = await Promise.all([
    db
      .select({ eid: eventPerformers.eventId, slug: performers.slug, name: performers.displayName })
      .from(eventPerformers)
      .innerJoin(performers, eq(performers.id, eventPerformers.performerId))
      .where(and(inArray(eventPerformers.eventId, ids), eq(eventPerformers.status, "confirmed"))),
    db.select({ id: performers.id, name: performers.displayName, slug: performers.slug }).from(performers).where(inArray(performers.id, [...new Set(list.map((e) => e.organizerId))])),
  ]);
  return list.map((e) => ({
    id: e.id, title: e.title, city: areaBySlug(e.city)?.short ?? "", place: e.place, startsAt: e.startsAt.toISOString(), priceText: e.priceText, cover: e.coverUrl,
    organizer: orgs.find((o) => o.id === e.organizerId)?.name ?? "", organizerSlug: orgs.find((o) => o.id === e.organizerId)?.slug ?? "",
    acts: tags.filter((t) => t.eid === e.id).map((t) => ({ slug: t.slug, name: t.name })), guestActs: e.guestActs,
    promoted: promos.some((x) => x.eventId === e.id), promoId: promos.find((x) => x.eventId === e.id)?.id ?? null,
  }));
}

/** 近期活動（首頁、/events、地區頁共用） */
export async function upcomingEvents(opts: { city?: string; limit?: number; slot?: EventSlot } = {}) {
  const db = await getDb();
  const conds = [eq(events.status, "published"), gte(events.startsAt, new Date(Date.now() - 6 * 3600_000))];
  if (opts.city) conds.push(eq(events.city, opts.city));
  const list = await db.select().from(events).where(and(...conds)).orderBy(asc(events.startsAt)).limit(opts.limit ?? 30);
  let shown: { id: string; eventId: string | null }[] = [];
  if (opts.slot) {
    const now = new Date();
    const rows = await db
      .select({ id: promotions.id, eventId: promotions.eventId })
      .from(promotions)
      .where(and(eq(promotions.slot, opts.slot), lt(promotions.startsAt, now), gte(promotions.endsAt, now), ...(opts.city ? [eq(promotions.city, opts.city)] : [])))
      .limit(EVENT_PROMO[opts.slot].cap * 3);
    const seen = new Set<string>();
    shown = rows
      .filter((r) => r.eventId && list.some((e) => e.id === r.eventId) && !seen.has(r.eventId) && (seen.add(r.eventId), true))
      .slice(0, EVENT_PROMO[opts.slot].cap);
    await bumpImpressions(shown.map((x) => x.id));
  }
  const cards = await toCards(list, shown);
  return shown.length ? cards.sort((a, b) => Number(b.promoted) - Number(a.promoted)) : cards;
}

export async function eventDetail(id: string) {
  const db = await getDb();
  const [ev] = await db.select().from(events).where(eq(events.id, id));
  if (!ev) return null;
  const [org] = await db.select().from(performers).where(eq(performers.id, ev.organizerId));
  const acts = await db
    .select({ slug: performers.slug, name: performers.displayName, act: performers.actType, avatar: performers.avatarUrl, cover: performers.coverUrl, bio: performers.bio })
    .from(eventPerformers)
    .innerJoin(performers, eq(performers.id, eventPerformers.performerId))
    .where(and(eq(eventPerformers.eventId, id), eq(eventPerformers.status, "confirmed")));
  return { ev, org, acts };
}

export async function myEvents(organizerId: string) {
  const db = await getDb();
  const list = await db.select().from(events).where(eq(events.organizerId, organizerId)).orderBy(desc(events.startsAt)).limit(40);
  if (!list.length) return [];
  const tags = await db
    .select({ eid: eventPerformers.eventId, slug: performers.slug, name: performers.displayName, status: eventPerformers.status })
    .from(eventPerformers)
    .innerJoin(performers, eq(performers.id, eventPerformers.performerId))
    .where(inArray(eventPerformers.eventId, list.map((e) => e.id)));
  return list.map((e) => ({ ...e, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt?.toISOString() ?? null, tags: tags.filter((t) => t.eid === e.id) }));
}

/** 表演者在後台看到自己被標記的活動 */
export async function taggedEvents(performerId: string) {
  const db = await getDb();
  const rows = await db
    .select({ e: events, status: eventPerformers.status, org: performers.displayName })
    .from(eventPerformers)
    .innerJoin(events, eq(events.id, eventPerformers.eventId))
    .innerJoin(performers, eq(performers.id, events.organizerId))
    .where(and(eq(eventPerformers.performerId, performerId), gte(events.startsAt, new Date(Date.now() - 30 * 86400_000))))
    .orderBy(asc(events.startsAt));
  return rows.map((r) => ({ id: r.e.id, title: r.e.title, place: r.e.place, cityName: areaBySlug(r.e.city)?.name ?? "", startsAt: r.e.startsAt.toISOString(), status: r.status, organizer: r.org, cancelled: r.e.status === "cancelled" }));
}

export async function buyEventPromotion(org: Performer, eventId: string, slot: EventSlot, days: number) {
  if (![7, 14, 30].includes(days)) throw new EventError("天數不正確");
  const db = await getDb();
  const ev = await ownEvent(org, eventId);
  const cfg = EVENT_PROMO[slot];
  const now = new Date();
  const taken = await db
    .select({ eid: promotions.eventId })
    .from(promotions)
    .where(and(eq(promotions.slot, slot), eq(promotions.city, ev.city), gte(promotions.endsAt, now)));
  if (taken.some((t) => t.eid === ev.id)) throw new EventError("這場活動已經在刊登這個版位");
  if (new Set(taken.map((t) => t.eid)).size >= cfg.cap) throw new EventError(`這個版位目前滿了（每個地區 ${cfg.cap} 格），到期後會開放`);
  const cost = cfg.daily * days * 100;
  if (org.pointsCents < cost) throw new EventError(`點數不足，需要 ${cfg.daily * days} 點`);
  return db.transaction(async (tx) => {
    await applyPoints(tx, org.id, -cost, "event_promo", { note: `${cfg.name} ${days} 天` });
    const [row] = await tx
      .insert(promotions)
      .values({ performerId: org.id, eventId: ev.id, slot, city: ev.city, actType: "event", startsAt: now, endsAt: new Date(now.getTime() + days * 86400_000), costCents: cost })
      .returning();
    return row;
  });
}

export async function eventPromotions(organizerId: string) {
  const db = await getDb();
  const rows = await db
    .select({ p: promotions, title: events.title })
    .from(promotions)
    .leftJoin(events, eq(events.id, promotions.eventId))
    .where(eq(promotions.performerId, organizerId))
    .orderBy(desc(promotions.createdAt))
    .limit(20);
  return rows.map((r) => ({ ...r.p, startsAt: r.p.startsAt.toISOString(), endsAt: r.p.endsAt.toISOString(), title: r.title ?? "" }));
}

/** 統計：給主辦看的活動成效（曝光先用簡單的計數） */
export async function eventStats(organizerId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<number>`count(*)::int`, upcoming: sql<number>`count(*) filter (where ${events.startsAt} > now())::int` })
    .from(events)
    .where(and(eq(events.organizerId, organizerId), eq(events.status, "published")));
  return { total: Number(row?.total ?? 0), upcoming: Number(row?.upcoming ?? 0) };
}
