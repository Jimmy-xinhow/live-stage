import Link from "next/link";
import type { Metadata } from "next";
import { mapPins } from "@/lib/map";
import { AREAS, areaBySlug, TAIWAN_CENTER } from "@/lib/areas";
import { APP_NAME } from "@/lib/env";
import { JsonLd, breadcrumb } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { MapView } from "./MapView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ city?: string }> }): Promise<Metadata> {
  const area = areaBySlug((await searchParams).city);
  return {
    title: `${area ? `${area.short}表演地圖` : "現場表演地圖"}｜誰正在演出、近期活動在哪｜${APP_NAME}`,
    description: `在地圖上看${area ? area.name : "全台"}正在演出的表演者與近兩週的演出活動，點開就能看歌單、點歌或邀請演出。`,
    alternates: { canonical: area ? `/map?city=${area.slug}` : "/map" },
  };
}

export default async function MapPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const area = areaBySlug((await searchParams).city);
  const pins = await mapPins(area?.slug);
  const center = area ? { lat: area.lat, lng: area.lng, zoom: 11 } : TAIWAN_CENTER;
  const live = pins.filter((p) => p.kind === "live").length;
  return (
    <>
      <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: "表演地圖", path: "/map" }])} />
      <SiteHeader />
      <main className="wrap pb-16">
        <nav aria-label="麵包屑" className="small py-4"><Link href="/" className="underline">首頁</Link> › 表演地圖</nav>
        <h1 className="h1">{area ? `${area.name}表演地圖` : "現場表演地圖"}</h1>
        <p className="small mt-1">
          {live > 0 ? <><span className="num font-semibold text-ink">{live}</span> 位正在演出・</> : null}
          <span className="num font-semibold text-ink">{pins.length - live}</span> 場近兩週的活動。沒有填精確地點的，會標在縣市中心。
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link href="/map" className={`tag !h-9 shrink-0 !px-3 !text-[14px] ${area ? "tag-quiet" : "!bg-ink !text-paper"}`}>全台</Link>
          {AREAS.map((a) => (
            <Link key={a.slug} href={`/map?city=${a.slug}`} className={`tag !h-9 shrink-0 !px-3 !text-[14px] ${area?.slug === a.slug ? "!bg-ink !text-paper" : "tag-quiet"}`}>{a.short}</Link>
          ))}
        </div>

        <MapView pins={pins} center={center} />
      </main>
      <SiteFooter />
    </>
  );
}
