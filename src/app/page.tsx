import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME, env } from "@/lib/env";
import { liveList } from "@/lib/discover";
import { JsonLd, absUrl } from "@/lib/seo";
import { Photo, SiteFooter, SiteHeader } from "@/components/Site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${APP_NAME}｜讓現場的聽眾點歌給你`,
  description:
    "街頭與駐唱表演者的現場點歌台。聽眾掃 QR 點一首想聽的歌，歌直接進你的排隊清單，款項直接進你的帳戶。平台不抽演出費。",
  alternates: { canonical: "/" },
};

/**
 * 首頁的讀者是表演者，不是觀眾。
 * 觀眾幾乎都是在現場掃 QR 直接進 /p/[slug]，不會從首頁進來。
 */
export default async function Home() {
  const live = await liveList(undefined, 6);
  const fee = Math.round(env.billing.feeRate * 100);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: APP_NAME,
          url: absUrl("/"),
          description: "街頭與駐唱表演者的現場點歌台",
        }}
      />
      <SiteHeader />

      <main id="main" className="wrap">
        {/* 主張：一句話說清楚這是什麼 */}
        <section className="pt-14 pb-16 md:pt-20 md:pb-20">
          <div className="max-w-[760px]">
            <span className="label">給街頭藝人與駐唱歌手</span>
            <h1 className="mt-3 text-[40px] leading-[1.12] font-extrabold tracking-tight md:text-[64px]">
              讓現場的聽眾<br />點歌給你
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-8 text-ink2 md:text-[19px]">
              聽眾掃你的 QR，點一首想聽的歌、順手給點什麼。歌直接進你的排隊清單，
              錢直接進你自己的帳戶——平台不經手，也不抽演出費。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn btn-primary">建立我的點歌頁</Link>
              <Link href="/p/demo" className="btn btn-secondary">看聽眾會看到什麼</Link>
            </div>
            <p className="small mt-4">免費建立，只有成交時收 {fee}% 服務費。</p>
          </div>
        </section>

        {/* 三步驟：把整條流程講完，不要讓人猜 */}
        <section className="sec pb-16 md:pb-20" aria-labelledby="how">
          <h2 id="how" className="h2 mb-6">現場怎麼運作</h2>
          <ol className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            {[
              ["01", "開演，亮出 QR", "在後台按開始演出，手機或立牌上的 QR 就會指向你的點歌頁。歌單是你自己設定的。"],
              ["02", "聽眾點歌", "掃碼、挑一首、填想說的話、付款。不用下載 App，也不用註冊帳號。"],
              ["03", "你看到、你唱", "歌進到演出控制台的排隊清單，唱完按一下結單。大螢幕和直播畫面會同步顯示現在這首。"],
            ].map(([n, t, d]) => (
              <li key={n}>
                <span className="num text-[15px] font-bold text-now">{n}</span>
                <h3 className="h3 mt-1">{t}</h3>
                <p className="small mt-2 leading-7">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 社會證明：現在真的有人在用。沒人在演出時整塊不出現 */}
        {live.length > 0 && (
          <section className="sec pb-16 md:pb-20" aria-labelledby="live">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 id="live" className="h2 flex items-center gap-2"><span className="dot-now" />現在演出中</h2>
              <span className="small">{live.length} 位</span>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-4">
              {live.slice(0, 4).map((l) => (
                <Link key={l.slug} href={`/p/${l.slug}`} className="group">
                  <Photo src={l.cover ?? l.avatar} ratio="4 / 5" label="現場照" />
                  <strong className="mt-2.5 block text-[17px] leading-6 group-hover:underline">{l.name}</strong>
                  <span className="small block">{l.city}・{l.location}</span>
                  <span className="small block">可點歌・排隊 {l.waiting} 首</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 把疑慮一次講完：這是表演者最想知道的三件事 */}
        <section className="sec pb-16 md:pb-24" aria-labelledby="money">
          <h2 id="money" className="h2 mb-6">錢怎麼算</h2>
          <div className="grid gap-x-10 gap-y-7 md:grid-cols-3">
            <div>
              <h3 className="h3">款項直接進你的帳戶</h3>
              <p className="small mt-2 leading-7">
                聽眾付給你，不是付給平台。你可以用 LINE Pay、街口、轉帳收款碼，或接自己的刷卡金流。
                平台從頭到尾不碰這筆錢。
              </p>
            </div>
            <div>
              <h3 className="h3">只收 {fee}% 服務費</h3>
              <p className="small mt-2 leading-7">
                用點數預扣，成交才扣。不抽演出費、不收月費、不綁約。
                點數用完就暫停接單，不會欠錢。
              </p>
            </div>
            <div>
              <h3 className="h3">聽眾會回來找你</h3>
              <p className="small mt-2 leading-7">
                點過歌的人可以追蹤你，你下次開演時他們會收到 LINE 通知。
                這是街頭表演最難累積、但最值錢的東西。
              </p>
            </div>
          </div>
          <div className="mt-9">
            <Link href="/login" className="btn btn-primary">建立我的點歌頁</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
