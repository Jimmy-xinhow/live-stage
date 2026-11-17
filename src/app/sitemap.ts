import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { indexablePerformers } from "@/lib/discover";
import { FEATURES } from "@/lib/features";

// 即時資料（誰正在表演），每次請求產生；也避免建置時需要連資料庫
export const dynamic = "force-dynamic";

/**
 * 收斂後只收錄兩種頁面：首頁、有歌單的表演者作品頁。
 * 地區頁、活動頁、地圖都關掉了，不放進 sitemap。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const perfs = await indexablePerformers();
  const now = new Date();
  return [
    { url: `${env.baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...perfs.map((p) => ({ url: `${env.baseUrl}/u/${p.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...(FEATURES.seoAreas ? [{ url: `${env.baseUrl}/area`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 }] : []),
  ];
}
