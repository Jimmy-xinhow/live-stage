import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/env";
import { areaBySlug } from "@/lib/areas";
import { actBySlug } from "@/lib/acts";
import { actCounts } from "@/lib/market";
import { JsonLd, breadcrumb } from "@/lib/seo";
import { Results } from "@/components/Results";
import { SiteFooter, SiteHeader } from "@/components/Site";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const pr = await params;
  const area = areaBySlug(pr.slug);
  const act = null as ReturnType<typeof actBySlug>;
  if (!area) return {};
  const counts = await actCounts(area.slug);
  const n = act ? counts[act.slug] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0);
  const what = act?.name ?? "現場表演";
  return {
    title: `${area.short}${what}｜演出中、行程與邀約｜${APP_NAME}`,
    description: `${area.name}的${what}：誰正在演出、平台累積的演出場次與歌單、公開起價。可以直接到現場點歌，或免費送出邀約。`,
    alternates: { canonical: `/area/${area.slug}${act ? `/${act.slug}` : ""}` },
    // 沒有真實結果的頁面不收錄
    robots: n > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: P) {
  const pr = await params;
  const area = areaBySlug(pr.slug);
  const act = null as ReturnType<typeof actBySlug>;
  if (!area) notFound();
  const base = (f: { city?: string; act?: string }) => `/area/${f.city ?? area.slug}${f.act ? `/${f.act}` : ""}`;
  return (
    <>
      <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: area.name, path: `/area/${area.slug}` }, ...(act ? [{ name: act.name, path: `/area/${area.slug}/${act.slug}` }] : [])])} />
      <SiteHeader />
      <Results city={area.slug} act={act?.slug} base={base} />
      <SiteFooter />
    </>
  );
}
