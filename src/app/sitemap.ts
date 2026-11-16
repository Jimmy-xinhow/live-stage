import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { areaCounts, indexablePerformers } from "@/lib/discover";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { listable } from "@/lib/discover";
import { sql } from "drizzle-orm";
import { upcomingEvents } from "@/lib/events";

// 即時資料（誰正在表演），每次請求產生；也避免建置時需要連資料庫
export const dynamic = "force-dynamic";

/** 只放可收錄的頁面：有藝人的地區頁、有歌單的藝人頁 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, perfs] = await Promise.all([areaCounts(), indexablePerformers()]);
  const now = new Date();
  const db = await getDb();
  const combos = await db.select({ city: performers.city, act: performers.actType, n: sql<number>`count(*)::int` }).from(performers).where(listable).groupBy(performers.city, performers.actType);
  const evs = await upcomingEvents({ limit: 200 });
  return [
    { url: `${env.baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${env.baseUrl}/area`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...areas.filter((a) => a.performers > 0).map((a) => ({ url: `${env.baseUrl}/area/${a.slug}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...combos.map((c) => ({ url: `${env.baseUrl}/area/${c.city}/${c.act}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...perfs.map((p) => ({ url: `${env.baseUrl}/u/${p.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${env.baseUrl}/events`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
    { url: `${env.baseUrl}/map`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 },
    ...evs.map((e) => ({ url: `${env.baseUrl}/e/${e.id}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.6 })),
  ];
}
