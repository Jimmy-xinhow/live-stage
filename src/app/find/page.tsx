import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/env";
import { areaBySlug } from "@/lib/areas";
import { actBySlug } from "@/lib/acts";
import { Results } from "@/components/Results";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `找表演｜${APP_NAME}`, robots: { index: false, follow: true } };

export default async function Find({ searchParams }: { searchParams: Promise<{ city?: string; act?: string; q?: string; live?: string }> }) {
  if (!FEATURES.discovery) notFound();
  const sp = await searchParams;
  const city = areaBySlug(sp.city)?.slug;
  const act = actBySlug(sp.act)?.slug;
  const q = sp.q?.trim().slice(0, 30) || undefined;
  // 有縣市、沒有其他條件時，導到可收錄的地區頁
  if (city && !q && !sp.live) redirect(act ? `/area/${city}/${act}` : `/area/${city}`);
  const base = (f: { city?: string; act?: string }) => (f.city ? `/area/${f.city}${f.act ? `/${f.act}` : ""}` : `/find${f.act ? `?act=${f.act}` : ""}`);
  return (<><SiteHeader /><Results city={city} act={act} q={q} live={!!sp.live} base={base} /><SiteFooter /></>);
}
