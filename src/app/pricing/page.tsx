import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { Band, StageFooter, StageHeader } from "@/components/market/Shell";
import { Faq } from "@/components/market/Bits";
import { Lead } from "@/components/market/Lead";
import { PLANS, boughtForFeatures, breakEven } from "@/lib/plans";
import { Calc } from "./Calc";

export const metadata: Metadata = {
  title: "方案與費用",
  description:
    "免費方案就有完整的點歌、排隊、大螢幕與 OBS 同步，只在成交時收 3%。付費方案成交費一律 1%：點歌台 NT$299 加上對帳與經營工具，互動 NT$699 解鎖八款現場遊戲，全部 NT$1,290 再加跨表演者 PK、OBS 疊層與樂團拆帳。不綁約。",
  alternates: { canonical: "/pricing" },
};

const nt = (n: number) => `NT$${n.toLocaleString()}`;

export default function Pricing() {
  const be = breakEven();
  return (
    <div className="stage min-h-screen">
      <StageHeader />
      <main id="main">
        <Band light="sodium" className="pt-14 pb-16 md:pt-20">
          <div className="max-w-[720px]">
            <h1 className="d1">
              免費的那層<br />不是試用版
            </h1>
            <p className="lede mt-6">
              點歌、收款、排隊、大螢幕、OBS 同步，免費方案全部都有，而且沒有期限。
              我們只在你真的收到錢的時候抽 3%——你沒收到，我們就沒有收入。
            </p>
            <p className="body mt-5">
              付費方案不是把免費的功能鎖起來再賣你，是另外解鎖只有一部分人用得到的東西：
              要報稅對帳的人需要匯出，要炒熱現場的人需要互動遊戲，線上開播和樂團分帳的人需要最上面那層。
              你用不到就不用買，這不會影響你收錢。
            </p>
          </div>
        </Band>

        {/* 四層方案 */}
        <Band className="pb-16">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.slug} className={`pane flex flex-col gap-5 p-6 ${p.slug === "play" ? "pane-lit" : ""}`}>
                <div>
                  <div className="flex min-h-[24px] items-baseline gap-2">
                    <strong className="text-[21px]">{p.name}</strong>
                    {p.slug === "play" && (
                      <span className="rounded-full bg-[color:var(--sodium)] px-2.5 py-1 text-[11px] font-bold text-[#1a1205]">最多人問的</span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[color:var(--dim)]">{p.who}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="num text-[38px] leading-none font-black">{nt(p.price)}</span>
                  </div>
                  <div className="mt-1.5 text-[13px] text-[color:var(--dim)]">{p.priceNote}</div>
                  <div className="mt-3 border-t border-[color:var(--line)] pt-3 text-[14px]">
                    成交服務費{" "}
                    <strong className="num text-[color:var(--sodium)]">{(p.feeRate * 100).toFixed(0)}%</strong>
                  </div>
                </div>

                <div>
                  <div className="text-[13px] font-bold text-[color:var(--dim)]">
                    {p.slug === "free" ? "免費就有這些" : "這一層多解鎖"}
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-2 text-[14px] leading-6">
                    {p.adds.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="shrink-0 text-[color:var(--sodium)]">＋</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {p.slug !== "free" && (
                    <p className="mt-3 text-[13px] leading-5 text-[color:var(--dim)]">含前一層的全部功能。</p>
                  )}
                </div>

                <Link href="/login" className={`sbtn mt-auto w-full !text-[15px] ${p.slug === "free" ? "sbtn-main" : "sbtn-ghost"}`}>
                  {p.slug === "free" ? "免費建立" : "先免費開始"}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[760px] text-[15px] leading-7 text-[color:var(--dim)]">
            全部方案都從免費開始，要升級在後台按一下，不用重新註冊也不用搬資料。
            按月計算，隨時取消，取消後當期用到底，不扣下一期。
          </p>
        </Band>

        {/* 誠實說清楚哪一層是靠費率、哪一層是買功能 */}
        <Band light="wash" className="rule pt-16 pb-16 md:pt-20">
          <div className="max-w-[760px]">
            <h2 className="d2">哪一層該升，兩種完全不同的理由</h2>
            <div className="mt-8 flex flex-col gap-7">
              <div>
                <h3 className="text-[20px] font-black">免費 → 點歌台：算得出來的</h3>
                <p className="body mt-2">
                  成交費從 3% 降到 1%，省下的 2% 在月營業額 {nt(be)} 的時候剛好等於 {nt(299)} 月費。
                  超過這個數就是你划算，低於就留在免費——這不用我們說服你，下面拉一下就知道。
                </p>
              </div>
              <div>
                <h3 className="text-[20px] font-black">點歌台 → 互動 / 全部：買的是功能，不是費率</h3>
                <p className="body mt-2">
                  這兩層的成交費跟點歌台一樣是 1%，所以不會因為你接得多就自動划算。
                  升上去的理由只有一個：你需要那些功能。互動方案買的是八款讓觀眾動起來的遊戲，
                  全部方案買的是跨表演者 PK、OBS 疊層和樂團拆帳。
                </p>
                <p className="mt-3 text-[15px] leading-7 text-[color:var(--dim)]">
                  我們本來想把費率做成每層遞減，算完發現互動方案要月營業額八萬才靠費率回本——那不是真的理由，
                  寫出來只是在硬湊。所以就這樣講。
                </p>
              </div>
            </div>
          </div>
        </Band>

        {/* 試算 */}
        <Band light="haze" className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">自己拉一次</h2>
          <p className="body mt-4">看你的量落在哪裡，不用相信我們的說法。</p>
          <div className="mt-8 max-w-[600px]">
            <Calc />
          </div>
        </Band>

        {/* 真正的對手 */}
        <Band className="rule pt-16 pb-16 md:pt-20">
          <div className="max-w-[760px]">
            <h2 className="d2">「我放一張 LINE Pay 收款碼就好了，為什麼要付你錢？」</h2>
            <p className="body mt-5">
              這是該問的問題。收款碼免費、你已經有了、也真的能收到錢。所以我們不跟它比收款，
              比的是收款碼做不到的四件事。
            </p>

            <div className="mt-9 flex flex-col gap-8">
              <div>
                <h3 className="text-[19px] font-black">一、收款碼不知道那筆錢是點哪首歌</h3>
                <p className="body mt-2">
                  有人掃了碼、轉了 150 塊，然後在旁邊喊了一首歌名。你在彈吉他，沒聽清楚，
                  也沒辦法一邊彈一邊打開 APP 看是誰轉的。{BRAND.name}把金額跟歌名、留言、人綁在一起，
                  下一首唱什麼直接顯示在你面前，不用記。
                </p>
              </div>
              <div>
                <h3 className="text-[19px] font-black">二、收款碼沒有排隊</h3>
                <p className="body mt-2">
                  三個人同時點歌，誰先誰後？用收款碼的話你得自己記、自己喬，記錯了還會被嫌。
                  排隊清單是自動的，誰在等、等幾首，聽眾在自己手機上看得到，不會一直過來問你。
                </p>
              </div>
              <div>
                <h3 className="text-[19px] font-black">三、收款碼結束就結束了</h3>
                <p className="body mt-2">
                  那個轉了 150 塊的人，下次你在哪裡演出他不會知道。{BRAND.name}會問他要不要追蹤，
                  你下次開演他的 LINE 就收到通知。一年下來這些人累積起來，就是你自己的聽眾名單，
                  不是平台的。你要帶走隨時可以匯出。
                </p>
              </div>
              <div>
                <h3 className="text-[19px] font-black">四、收款碼不會讓人想多待十分鐘</h3>
                <p className="body mt-2">
                  這是互動方案在賣的東西。有遊戲在跑的時候，觀眾會從「聽完就走」變成「想看結果」。
                  兵團對戰、拔河、命運轉盤，這些不是為了好玩而好玩，是為了把停留時間變長——
                  而停留時間就是你的收入。
                </p>
              </div>
            </div>

            <p className="mt-9 text-[16px] leading-8">
              如果你一個月只演兩三場、一場收個幾百塊，老實說收款碼就夠了，免費方案拿去用也不用升級。
              會需要付費的是那種一週演三場、開始要報稅、開始有固定聽眾會來找你的人。
            </p>
          </div>
        </Band>

        {/* 錢的細節 */}
        <Band className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">關於錢，先講清楚</h2>
          <div className="mt-8 max-w-[780px]">
            <Faq
              dark
              items={[
                {
                  q: "服務費是從我收到的錢裡面扣嗎？",
                  a: "不是，款項根本不經過我們——聽眾付的錢直接進你的收款帳戶。服務費是從你在平台上的點數餘額扣，等於你先放一小筆在這裡，成交時逐筆扣掉。註冊會送新手點數，你可以先用一陣子再決定要不要儲值。",
                },
                {
                  q: "點數用完會發生什麼事？",
                  a: "會先讓你小額透支，不會演到一半被中斷。超過透支額度才會暫停接單，而且會先通知你。我們不會自動扣你的信用卡，也不會讓你欠一筆不知道怎麼來的錢。",
                },
                {
                  q: "刷卡的手續費算誰的？",
                  a: "那是金流商（綠界、藍新這些）跟你收的，跟我們的服務費是兩回事。你如果用自己的 LINE Pay 或街口收款碼，就沒有這筆。",
                },
                {
                  q: "升級要綁約嗎？會不會自動續約到我忘記？",
                  a: "不綁約。按月計算，在後台按一下就能取消，取消後當期用到底，不扣下一期。我們不做年繳折扣，因為那會讓取消變得麻煩。",
                },
                {
                  q: "有免費試用期嗎？",
                  a: "免費方案本身就是長期免費，不是試用。核心的點歌收款功能完整給，差別在成交費率和上面那些另外的工具。不過互動方案我們可以讓你在第一場演出免費開著試，你覺得不值再關掉——跟我們說一聲就好。",
                },
                {
                  q: "樂團拆帳怎麼算？手續費誰付？",
                  a: "在後台設定每個團員的比例，款項按比例分進各自的帳戶，每個人只看得到自己的金額。服務費從團長的點數扣，不會重複收。",
                },
                {
                  q: "我不做了，資料能帶走嗎？",
                  a: "能。聽眾名單、演出紀錄、收入明細都可以匯出成檔案，不用申請也不用等我們審核。我們不把你的聽眾當成我們的資產。",
                },
                {
                  q: "互動遊戲會不會變成變相賭博？",
                  a: "不會，而且我們在設計上就擋掉了。遊戲的結果只決定表演內容（唱哪首、做什麼），沒有獎金、沒有抽獎、付費加成在該場結束後不保留。命運轉盤上的項目是觀眾投稿、你審核過才會上盤，而且觀眾不會拿到任何獎品。這條線我們不會為了好玩而放寬。",
                },
              ]}
            />
          </div>
        </Band>

        <Band light="sodium" className="rule pt-16 pb-24 md:pt-20 md:pb-28">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="d2">下一場就能用</h2>
              <p className="body mt-4">免費方案不用信用卡，註冊回答兩個問題就設定完，歌單可以之後再補。</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link>
                <Link href="/p/demo" className="sbtn sbtn-ghost">先看聽眾會看到什麼</Link>
              </div>
              <p className="mt-4 text-[14px] text-[color:var(--dim)]">不綁約，隨時可以停，資料帶得走。</p>
            </div>
            <Lead dark />
          </div>
        </Band>
      </main>
      <StageFooter />
    </div>
  );
}
