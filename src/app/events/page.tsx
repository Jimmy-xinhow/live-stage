import Link from "next/link";
import type { Metadata } from "next";
import { upcomingEvents } from "@/lib/events";
import { areaBySlug } from "@/lib/areas";
import { APP_NAME } from "@/lib/env";
import { JsonLd, breadcrumb } from "@/lib/seo";
import { EventLine, SiteFooter, SiteHeader } from "@/components/Site";
import { AreaSelect } from "@/components/AreaSelect";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ city?: string }> }): Promise<Metadata> {
  const area = areaBySlug((await searchParams).city);
  return {
    title: `${area ? `${area.short}演出活動` : "近期演出活動"}｜現場音樂、駐唱、表演｜${APP_NAME}`,
    description: `${area ? `${area.name}的` : "全台的"}演出活動：時間、地點、票價與演出者，由店家與主辦自行刊登。`,
    alternates: { canonical: area ? `/events?city=${area.slug}` : "/events" },
  };
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  if (!FEATURES.events) notFound();
  const city = (await searchParams).city;
  const area = areaBySlug(city);
  const list = await upcomingEvents({ city: area?.slug, limit: 50, slot: "event_top" });
  return (
    <>
      <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: "演出活動", path: "/events" }])} />
      <SiteHeader />
      <main className="wrap pb-16">
        <nav aria-label="麵包屑" className="small py-4"><Link href="/" className="underline">首頁</Link> › 演出活動</nav>
        <h1 className="h1">{area ? `${area.name}演出活動` : "近期演出活動"}</h1>
        <p className="small mt-1">店家與主辦刊登的演出。想刊登自己的活動？<Link href="/login" className="underline">用店家／主辦帳號登入</Link>。</p>

        <div className="mt-5 max-w-[240px]">
          <AreaSelect value={area?.slug} base="/events" />
        </div>

        <div className="sec mt-6">
          {list.length ? list.map((e) => <EventLine key={e.id} e={e} />) : <p className="small py-8">{area ? `${area.name}目前沒有刊登中的活動。` : "目前沒有刊登中的活動。"}</p>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
