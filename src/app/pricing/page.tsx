import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/env";
import { Band, StageFooter, StageHeader } from "@/components/market/Shell";
import { Faq } from "@/components/market/Bits";
import { Lead } from "@/components/market/Lead";
import { PLANS, breakEven } from "@/lib/plans";
import { Calc } from "./Calc";

export const metadata: Metadata = {
  title: `方案與費用｜${APP_NAME}`,
  description: "免費方案就有點歌、排隊、大螢幕與 OBS 同步，只在成交時收 3%。量大改月費 NT$299，成交費降到 1%，並解鎖對帳匯出、樂團拆帳與公告成圖。不綁約。",
  alternates: { canonical: "/pricing" },
};

export default function Pricing() {
  const be = breakEven();
  return (
    <div className="stage min-h-screen">
      <StageHeader />
      <main id="main">
        <Band light="sodium" className="pt-14 pb-16 md:pt-20">
          <div className="max-w-[680px]">
            <h1 className="d1">
              免費開始，<br />量大了再升級
            </h1>
            <p className="lede mt-6">
              我們的收入跟你的收入綁在一起——你沒收到錢，我們就沒有收入。
              不收開辦費、不綁約、不收月費（除非你自己算過覺得划算）。
            </p>
          </div>
        </Band>

        <Band className="pb-16">
          <div className="grid gap-5 md:grid-cols-2">
            {PLANS.map((p) => (
              <div key={p.slug} className={`pane flex flex-col gap-5 p-7 ${p.slug === "pro" ? "pane-lit" : ""}`}>
                <div>
                  <div className="flex items-baseline gap-2">
                    <strong className="text-[22px]">{p.name}</strong>
                    {p.slug === "pro" && <span className="rounded-full bg-[color:var(--sodium)] px-2.5 py-1 text-[12px] font-bold text-[#1a1205]">月收超過 NT${be.toLocaleString()} 更划算</span>}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="num text-[44px] leading-none font-black">NT${p.price}</span>
                    <span className="text-[14px] text-[color:var(--dim)]">{p.priceNote}</span>
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-[color:var(--dim)]">
                    成交服務費 <strong className="num text-[color:var(--bone)]">{(p.feeRate * 100).toFixed(0)}%</strong>。{p.pitch}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-[15px]">
                  {p.features.map((f) => (<li key={f} className="flex gap-2.5"><span className="text-[color:var(--sodium)]">✓</span>{f}</li>))}
                  {p.missing?.map((f) => (<li key={f} className="flex gap-2.5 text-[color:var(--dim)]"><span>—</span>{f}</li>))}
                </ul>
                <Link href="/login" className={`sbtn mt-auto w-full ${p.slug === "pro" ? "sbtn-ghost" : "sbtn-main"}`}>
                  {p.slug === "pro" ? "先免費開始，之後再升級" : "免費建立我的點歌頁"}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[14px] text-[color:var(--dim)]">專業方案在後台的「點數」頁隨時開啟或取消，取消後當期用完為止，不扣下一期。</p>
        </Band>

        <Band light="haze" className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">哪個划算，不用我們說</h2>
          <p className="body mt-4">拉一下，看你的量落在哪裡。</p>
          <div className="mt-8 max-w-[560px]"><Calc /></div>
        </Band>

        <Band className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">關於錢的細節</h2>
          <div className="mt-8 max-w-[760px]">
          <Faq
            dark
            items={[
              { q: "服務費是從我的收入扣嗎？", a: "不是直接從款項扣——款項根本不經過我們。服務費是從你的點數餘額扣，等於你先儲值一小筆，成交時逐筆扣掉。註冊會送新手點數，可以先用看看。" },
              { q: "點數用完會怎樣？", a: "會先讓你小額透支，避免演出到一半被中斷；超過透支額度才會暫停接單。我們不會讓你欠錢，也不會自動扣款。" },
              { q: "刷卡金流的手續費算誰的？", a: "那是金流商（綠界、藍新等）跟你收的，跟我們的服務費是兩回事。你用自己的收款碼就沒有這筆。" },
              { q: "升級專業方案綁約嗎？", a: "不綁。按月計，隨時取消，取消後當期用到底。" },
              { q: "有免費試用嗎？", a: "免費方案本身就是長期免費，不是試用期。核心功能全部都有，差別只在成交費率和幾個經營工具。" },
            ]}
          />
          </div>
        </Band>

        <Band light="sodium" className="rule pt-16 pb-24 md:pt-20 md:pb-28">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="d2">下一場就能用</h2>
              <p className="body mt-4">免費方案不需要信用卡，註冊兩個問題就設定完。</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link>
                <Link href="/p/demo" className="sbtn sbtn-ghost">先看聽眾的畫面</Link>
              </div>
              <p className="mt-4 text-[14px] text-[color:var(--dim)]">不綁約，隨時可以停。</p>
            </div>
            <Lead dark />
          </div>
        </Band>
      </main>
      <StageFooter />
    </div>
  );
}
