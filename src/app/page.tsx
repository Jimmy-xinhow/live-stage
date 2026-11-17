import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/env";
import { liveList, upcomingShows, areaCounts } from "@/lib/discover";
import { actCounts, homeFeatured } from "@/lib/market";
import { upcomingEvents } from "@/lib/events";
import { ACTS } from "@/lib/acts";
import { nt } from "@/lib/format";
import { JsonLd, absUrl } from "@/lib/seo";
import { EventLine, Photo, ShowRow, SiteFooter, SiteHeader } from "@/components/Site";
import { PromoLink } from "@/components/PromoLink";
import { HomeSearch } from "./HomeSearch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${APP_NAME}｜找現場表演、邀請表演者`,
  description: "街頭藝人、駐唱歌手、樂團、DJ、魔術的即時演出與行程。到了現場用手機點歌、打賞、一起玩；辦活動可以免費送出邀約，報價傳到 LINE。",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [live, shows, counts, featured, areas, events] = await Promise.all([liveList(undefined, 8), upcomingShows(undefined, 14, 6), actCounts(), homeFeatured(), areaCounts(), upcomingEvents({ limit: 6, slot: "event_home" })]);
  const activeAreas = areas.filter((a) => a.performers > 0);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: APP_NAME, url: absUrl("/"), potentialAction: { "@type": "SearchAction", target: absUrl("/find?q={q}"), "query-input": "required name=q" } }} />
      <SiteHeader />
      <main className="wrap">
        <HomeSearch />

        {live.length > 0 && (
          <section className="sec pb-16 md:pb-24" aria-labelledby="now">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 id="now" className="h2 flex items-center gap-3"><span className="dot-now" />現在演出中</h2>
              <Link href="/find?live=1" className="underline">看全部</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {live.map((l) => (
                <Link key={l.slug} href={`/p/${l.slug}`} className="flex flex-col gap-3">
                  <Photo src={l.cover ?? l.avatar} ratio="4 / 5" label="現場照" />
                  <span className="flex flex-col"><strong className="h3">{l.name}</strong><span className="small">{[l.city, l.location].filter(Boolean).join("・")}</span><span className="small font-medium text-nowtext">可點歌・排隊 {l.waiting} 首</span></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="sec pb-16 md:pb-24" aria-labelledby="week">
          <div className="mb-2 flex items-baseline justify-between"><h2 id="week" className="h2">接下來兩週</h2><Link href="/find" className="underline">找表演者</Link></div>
          {shows.length ? shows.map((s) => <ShowRow key={s.id} s={s} />) : <p className="small py-6">目前還沒有公開的演出預告。表演者登入後可以在後台新增。</p>}
        </section>

        {events.length > 0 && (
          <section className="sec pb-16 md:pb-24" aria-labelledby="ev">
            <div className="mb-2 flex items-baseline justify-between"><h2 id="ev" className="h2">店家與主辦的活動</h2><Link href="/events" className="underline">看全部</Link></div>
            {events.map((e) => <EventLine key={e.id} e={e} />)}
          </section>
        )}

        <section className="sec pb-16 md:pb-24" aria-labelledby="cat">
          <h2 id="cat" className="h2 mb-4">依表演類型</h2>
          <div className="grid grid-cols-2 gap-x-6 md:grid-cols-5">
            {ACTS.map((a) => (
              <Link key={a.slug} href={`/find?act=${a.slug}`} className="row flex items-baseline justify-between py-3.5">
                <span className="text-[17px] font-bold">{a.name}</span>
                <span className="small text-ink3"><span className="num text-[15px] font-semibold text-ink2">{counts[a.slug] ?? 0}</span> 位</span>
              </Link>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section className="sec pb-16 md:pb-24" aria-labelledby="ad">
            <div className="mb-6 flex items-baseline justify-between"><h2 id="ad" className="h2">推薦表演者</h2><span className="label">付費推薦</span></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {featured.map((c) => (
                <PromoLink key={c.slug} promoId={c.promoId} href={`/u/${c.slug}`} className="flex flex-col gap-3">
                  <Photo src={c.cover ?? c.avatar} ratio="4 / 5" label="宣傳照" className="!rounded-[20px]" />
                  <span className="flex flex-col"><strong className="h3">{c.name}</strong><span className="small">{c.actName}・{c.city}</span><span className="small">{c.priceFrom != null && <><span className="num text-[15px] font-semibold text-ink">{nt(c.priceFrom)}</span> 起・</>}平台紀錄 {c.shows} 場</span></span>
                </PromoLink>
              ))}
            </div>
          </section>
        )}

        {activeAreas.length > 0 && (
          <section className="sec pb-16 md:pb-24" aria-labelledby="area">
            <h2 id="area" className="h2 mb-4">依地區</h2>
            <div className="grid grid-cols-2 gap-x-6 md:grid-cols-5">
              {activeAreas.map((a) => (
                <Link key={a.slug} href={`/area/${a.slug}`} className="row flex items-baseline justify-between py-3.5">
                  <span className="text-[17px] font-bold">{a.name}</span>
                  <span className="small text-ink3">{a.live > 0 && <span className="mr-2 text-nowtext">{a.live} 演出中</span>}<span className="num text-[15px] font-semibold text-ink2">{a.performers}</span> 位</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="sec grid md:grid-cols-2">
          <div className="flex flex-col items-start gap-4 pb-10 md:pr-8">
            <h2 className="h2">給表演者</h2>
            <p className="max-w-[480px] text-ink2">觀眾在現場掃碼點歌、打賞，錢直接進你自己的帳戶。追蹤你的人會在你開演時收到 LINE 通知，婚禮和店家的邀約也會傳到你手上，平台不抽演出費。</p>
            <Link href="/login" className="btn btn-secondary">建立表演者頁</Link>
          </div>
          <div className="flex flex-col items-start gap-4 border-rule pb-10 md:border-l md:pl-8">
            <h2 className="h2">辦活動要找表演</h2>
            <p className="max-w-[480px] text-ink2">填一次需求，同時送給符合條件的表演者。每位表演者的頁面都有平台自動累積的演出場次與歌單，不是自己寫的介紹。</p>
            <Link href="/invite" className="btn btn-secondary">免費送出邀約</Link>
            <p className="small">有店或辦活動？<Link href="/login" className="underline">用店家／主辦帳號登入</Link>，可以刊登演出活動、標記演出者。</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
