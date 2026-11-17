import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME, env } from "@/lib/env";
import { liveList } from "@/lib/discover";
import { JsonLd, absUrl } from "@/lib/seo";
import { Band, StageFooter, StageHeader } from "@/components/market/Shell";
import { LiveDemo } from "@/components/market/LiveDemo";
import { Lead } from "@/components/market/Lead";
import { Faq } from "@/components/market/Bits";
import { KINDS } from "@/lib/kinds";
import { PLANS, breakEven } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${APP_NAME}｜讓聽眾點歌給你，錢直接進你的帳戶`,
  description:
    "給街頭藝人、駐唱歌手與直播主的點歌收款系統。聽眾掃碼點一首想聽的歌，歌自動排進你的清單，大螢幕與 OBS 同步顯示。款項直接進你的帳戶，平台只收 3%，不抽演出費、不收月費。",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const live = await liveList(undefined, 6);
  const fee = Math.round(env.billing.feeRate * 100);
  const be = breakEven();

  return (
    <div className="stage min-h-screen">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: APP_NAME,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: absUrl("/"),
          description: "給街頭藝人、駐唱歌手與直播主的點歌收款系統",
          offers: PLANS.map((p) => ({ "@type": "Offer", name: p.name, price: p.price, priceCurrency: "TWD" })),
        }}
      />
      <StageHeader />

      <main id="main">
        {/* 開場：一句主張，旁邊把整條流程演一次 */}
        <Band light="sodium" className="pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="grid items-center gap-14 md:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-[13px] text-[color:var(--dim)]">
                <i className="livedot" />
                街頭、駐唱、線上直播都能用
              </span>
              <h1 className="d1 mt-5">
                讓聽眾<br />點歌給你
              </h1>
              <p className="lede mt-6">
                聽眾掃你的碼，挑一首想聽的歌、寫一句話、付款。歌自動排進你的清單，
                大螢幕和直播畫面同步亮出來。錢直接進你自己的帳戶——我們不經手，也不抽演出費。
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link>
                <Link href="/p/demo" className="sbtn sbtn-ghost">看聽眾會看到什麼</Link>
              </div>
              <p className="mt-4 text-[14px] text-[color:var(--dim)]">
                不綁約、不收月費，只有成交時收 {fee}%。
              </p>
            </div>
            <LiveDemo />
          </div>
        </Band>

        {/* 產品本體：大螢幕滿版，這是這套系統最好看的東西 */}
        <Band className="pb-20 md:pb-28">
          <div className="pane glow-screen overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shots/bigscreen.png" alt="大螢幕畫面：正在唱的歌名、點歌的人與他的留言、掃碼點歌的 QR，以及本場支持排行" className="block w-full" />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <p className="body !max-w-[52ch]">
              這是接上投影機或電視後，全場看到的畫面。線上直播就把同一個網址加進 OBS。
              被唸到名字的那個瞬間，是他下次還會再點一首的理由。
            </p>
            <Link href="/for/venue" className="text-[15px] font-bold underline underline-offset-4">駐唱與樂團怎麼用</Link>
          </div>
        </Band>

        {/* 真實畫面：聽眾端與表演者端 */}
        <Band light="wash" id="how" className="rule pt-20 pb-20 md:pt-24 md:pb-28">
          <h2 className="d2">不用學新東西，<br className="md:hidden" />你本來就會的流程</h2>

          <div className="mt-14 grid items-center gap-10 md:grid-cols-[300px_1fr] md:gap-16">
            <div className="glow-phone mx-auto w-[240px] overflow-hidden md:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/fan-menu-c.png" alt="聽眾在手機上瀏覽歌單，可以搜尋歌名、依語言分類，每首旁邊是點歌金額" className="block w-full" />
            </div>
            <div>
              <h3 className="d3">歌單是你自己開的，聽眾自己挑</h3>
              <p className="body mt-3">
                幾百首都放得下，可以搜尋、分類，每首各自定價。
                聽眾不用下載 App、不用註冊，挑完寫一句想說的話就付款——信用卡、Apple Pay，
                或你自己的 LINE Pay 收款碼。
              </p>
            </div>
          </div>

          <div className="mt-16 grid items-center gap-10 md:grid-cols-[1fr_300px] md:gap-16">
            <div className="md:order-1">
              <h3 className="d3">演出中單手操作，三顆按鈕</h3>
              <p className="body mt-3">
                不用再盯聊天室、抄紙條、記在腦子裡。誰點了什麼、付了多少、想說什麼，
                照順序排好。開始唱、唱完了、跳過——站著單手就能按完。
              </p>
            </div>
            <div className="glow-phone mx-auto w-[240px] overflow-hidden md:order-2 md:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/console-c.png" alt="表演者的演出控制台：正在唱的歌、點歌人的留言，以及排隊清單與開始唱、跳過按鈕" className="block w-full" />
            </div>
          </div>
        </Band>

        {/* 三種情境 */}
        <Band className="rule pt-20 pb-20 md:pt-24 md:pb-28">
          <h2 className="d2">你是哪一種？</h2>
          <p className="body mt-4">註冊時選一個，排隊上限、金額、歌單範本、要不要大螢幕，全部幫你設好。之後都能改。</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {KINDS.map((k, i) => (
              <Link
                key={k.slug}
                href={`/for/${k.slug}`}
                className={`pane group flex flex-col gap-3 p-6 transition hover:border-[color:var(--sodium)] ${i === 1 ? "pane-lit" : ""}`}
              >
                <strong className="text-[20px] leading-7">{k.pitch}</strong>
                <p className="text-[15px] leading-7 text-[color:var(--dim)]">{k.desc}</p>
                <span className="mt-auto pt-3 text-[13px] text-[color:var(--dim)]">
                  排隊 {k.maxQueue} 首　金額 NT${k.amounts.join(" / NT$")}
                </span>
                <span className="text-[15px] font-bold text-[color:var(--sodium)] group-hover:underline">{k.name}怎麼用</span>
              </Link>
            ))}
          </div>
        </Band>

        {/* 錢 */}
        <Band light="haze" className="rule pt-20 pb-20 md:pt-24 md:pb-28">
          <h2 className="d2">款項直接進你的帳戶</h2>
          <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-3">
            <div>
              <h3 className="d3">錢不經過我們</h3>
              <p className="body mt-3">
                聽眾付給你，不是付給平台。可以用你自己的 LINE Pay、街口、轉帳收款碼，
                或接自己的刷卡金流。我們從頭到尾不碰這筆錢，也不會卡你的撥款。
              </p>
            </div>
            <div>
              <h3 className="d3">只收成交的 {fee}%</h3>
              <p className="body mt-3">
                用點數預扣，成交才扣。不抽演出費、不收月費、不綁約。
                一個月收超過 NT${be.toLocaleString()} 的話，月費方案更划算——
                <Link href="/pricing" className="underline underline-offset-4">自己算一次</Link>。
              </p>
            </div>
            <div>
              <h3 className="d3">紀錄是你的資產</h3>
              <p className="body mt-3">
                每一場演出、每一首被點的歌、每一位回來的聽眾，系統自動累積。
                這是你自己填不出來的東西——接案報價時它會替你說話。
              </p>
            </div>
          </div>
        </Band>

        {/* 現在正在用 */}
        {live.length > 0 && (
          <Band className="rule pt-16 pb-16 md:pt-20 md:pb-20">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <h2 className="flex items-center gap-2.5 text-[19px] font-bold"><i className="livedot" />現在正在用</h2>
              {live.map((l) => (
                <Link key={l.slug} href={`/p/${l.slug}`} className="rounded-full border border-[color:var(--line)] px-4 py-2 text-[15px] text-[color:var(--dim)] hover:border-[color:var(--sodium)]">
                  {l.name}　{l.city}
                </Link>
              ))}
            </div>
          </Band>
        )}

        {/* 方案 */}
        <Band className="rule pt-20 pb-20 md:pt-24 md:pb-28">
          <h2 className="d2">免費就能用全部核心功能</h2>
          <p className="body mt-4">免費方案不是殘廢版。量大了再升級，而且是你自己算得出來的決定。</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {PLANS.map((p) => (
              <div key={p.slug} className={`pane flex flex-col gap-5 p-7 ${p.slug === "pro" ? "pane-lit" : ""}`}>
                <div>
                  <div className="flex items-baseline gap-3">
                    <strong className="text-[21px]">{p.name}</strong>
                    {p.slug === "pro" && (
                      <span className="rounded-full bg-[color:var(--sodium)] px-2.5 py-1 text-[12px] font-bold text-[#1a1205]">量大更划算</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="num text-[42px] leading-none font-black">NT${p.price}</span>
                    <span className="text-[14px] text-[color:var(--dim)]">{p.priceNote}</span>
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-[color:var(--dim)]">
                    成交服務費 <strong className="num text-[color:var(--bone)]">{(p.feeRate * 100).toFixed(0)}%</strong>。{p.pitch}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-[15px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5"><span className="text-[color:var(--sodium)]">✓</span>{f}</li>
                  ))}
                  {p.missing?.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[color:var(--dim)]"><span>—</span>{f}</li>
                  ))}
                </ul>
                <Link href={p.slug === "pro" ? "/pricing" : "/login"} className={`sbtn mt-auto w-full ${p.slug === "pro" ? "sbtn-ghost" : "sbtn-main"}`}>
                  {p.slug === "pro" ? "看方案細節" : "免費開始"}
                </Link>
              </div>
            ))}
          </div>
        </Band>

        {/* 常見問題 */}
        <Band className="rule pt-20 pb-20 md:pt-24 md:pb-24">
          <h2 className="d2">開始之前，你大概會想問</h2>
          <div className="mt-8 max-w-[760px]">
            <Faq
              dark
              items={[
                { q: "聽眾需要下載 App 或註冊嗎？", a: "不用。掃碼直接開網頁，挑歌、付款就結束。只有想追蹤你、下次收開演通知的人，才會用 LINE 登入一次。" },
                { q: "錢什麼時候進我的帳戶？", a: "看你用哪種收款。用你自己的 LINE Pay、街口收款碼，聽眾是直接轉給你，我們完全不經手。接自己的刷卡金流，就照金流商的撥款週期走。平台不會卡你的錢。" },
                { q: `那 ${fee}% 的服務費怎麼收？`, a: "從點數餘額扣，成交才扣。註冊送新手點數，用完可以儲值。沒點數時會暫停接單，不會讓你欠錢。" },
                { q: "我沒有大螢幕也能用嗎？", a: "可以。街頭情境預設就不開大螢幕，只要一張印好的 QR 立牌。大螢幕是駐唱和直播才需要的。" },
                { q: "我在 YouTube 直播，這個怎麼接？", a: "把點歌連結放進直播描述，OBS 加一個瀏覽器來源就會顯示現在這首和排隊。我們不碰你的直播畫面，也不要求你換平台。" },
                { q: "可以隨時停用嗎？資料會被鎖住嗎？", a: "可以隨時停。演出紀錄和歌單都能匯出帶走。不綁約，也沒有解約金。" },
              ]}
            />
          </div>
        </Band>

        {/* 收尾：行動與跟進 */}
        <Band light="sodium" className="rule pt-20 pb-24 md:pt-24 md:pb-32">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="d2">下一場就能用</h2>
              <p className="body mt-4">
                註冊只要選一個情境、填一個名字，歌單範本和金額都幫你設好。
                印一張 QR 立牌，今晚就能讓人點歌。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link>
                <Link href="/pricing" className="sbtn sbtn-ghost">先看方案</Link>
              </div>
              <p className="mt-4 text-[14px] text-[color:var(--dim)]">不用信用卡，不綁約。</p>
            </div>
            <Lead dark />
          </div>
        </Band>
      </main>

      <StageFooter />
    </div>
  );
}
