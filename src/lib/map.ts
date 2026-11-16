import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import { eventPerformers, events, liveSessions, performers } from "./db/schema";
import { listable } from "./discover";
import { areaBySlug } from "./areas";
import { actName } from "./acts";

export type Pin = {
  kind: "live" | "event";
  id: string;
  href: string;
  title: string;
  sub: string;
  when: string;
  city: string;
  lat: number;
  lng: number;
  /** 沒有精確座標時標示為縣市中心，前台會說明 */
  approx: boolean;
};

/** 同一個座標上的點稍微散開，避免完全疊在一起 */
function spread(pins: Pin[]) {
  const seen = new Map<string, number>();
  return pins.map((p) => {
    const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (!n) return p;
    const a = (n * 137.5 * Math.PI) / 180;
    const r = 0.012 + n * 0.004;
    return { ...p, lat: p.lat + r * Math.sin(a), lng: p.lng + r * Math.cos(a) };
  });
}

const num = (v: string | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);

/** 地圖上的點：正在演出的表演者、近兩週的活動 */
export async function mapPins(city?: string): Promise<Pin[]> {
  const db = await getDb();
  const now = new Date();
  const [live, evs] = await Promise.all([
    db
      .select({ p: performers, location: liveSessions.location, startedAt: liveSessions.startedAt })
      .from(performers)
      .innerJoin(liveSessions, eq(liveSessions.id, performers.liveSessionId))
      .where(city ? and(listable, eq(performers.city, city)) : listable)
      .limit(80),
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          gte(events.startsAt, new Date(now.getTime() - 6 * 3600_000)),
          lte(events.startsAt, new Date(now.getTime() + 14 * 86400_000)),
          ...(city ? [eq(events.city, city)] : []),
        ),
      )
      .orderBy(asc(events.startsAt))
      .limit(80),
  ]);

  const tags = evs.length
    ? await db
        .select({ eid: eventPerformers.eventId, name: performers.displayName })
        .from(eventPerformers)
        .innerJoin(performers, eq(performers.id, eventPerformers.performerId))
        .where(eq(eventPerformers.status, "confirmed"))
    : [];

  const pins: Pin[] = [];
  for (const r of live) {
    const area = areaBySlug(r.p.city);
    if (!area) continue;
    const lat = num(r.p.lat) ?? area.lat;
    const lng = num(r.p.lng) ?? area.lng;
    pins.push({
      kind: "live", id: r.p.slug, href: `/p/${r.p.slug}`, title: r.p.displayName,
      sub: `${actName(r.p.actType)}・${r.location || r.p.district || area.name}`,
      when: "正在演出", city: area.short, lat, lng, approx: num(r.p.lat) == null,
    });
  }
  for (const e of evs) {
    const area = areaBySlug(e.city);
    if (!area) continue;
    const who = tags.filter((t) => t.eid === e.id).map((t) => t.name).join("、");
    pins.push({
      kind: "event", id: e.id, href: `/e/${e.id}`, title: e.title,
      sub: [e.place, who || e.guestActs].filter(Boolean).join("・"),
      when: e.startsAt.toISOString(), city: area.short,
      lat: num(e.lat) ?? area.lat, lng: num(e.lng) ?? area.lng, approx: num(e.lat) == null,
    });
  }
  return spread(pins);
}
