import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME, env } from "@/lib/env";
import { liveList } from "@/lib/discover";
import { JsonLd, absUrl } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { Cta, Faq, Head, Phone, Screen } from "@/components/market/Bits";
import { Lead } from "@/components/market/Lead";
import { KINDS } from "@/lib/kinds";
import { PLANS, breakEven } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${APP_NAME}｜讓聽眾點歌給你，錢直接進你的帳戶`,
  description:
    "給街頭藝人、駐唱歌手與直播主的點歌收款系統。聽眾掃碼點一首想聽的歌，歌自動排進你的清單，大螢幕與 OBS 同步顯示。款項直接進你的帳戶，平台只收 3%，不抽演出費、不收月費。",
  alternates: { canonical: "/" },
};

/**
 * 首頁＝銷售頁。動線：看見（主張＋產品畫面）→ 了解（怎麼運作，每步都有真實截圖）
 * → 感興趣（三種情境、錢怎麼算）→ 轉化（方案、常見問題、行動）→ 跟進（還沒決定的人留 Email）。
 *
 * 原則：每一個宣稱都要有畫面佐證。這是賣現場體驗的產品，純文字說服不了人。
 */
export default async function Home() {
  const live = await liveList(undefined, 6);
  const fee = Math.round(env.billing.feeRate * 100);
  const be = breakEven();

  return (
    <>
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
      <SiteHeader />

      <main id="main">
        {/* ── 看見：一句主張，旁邊就是真實產品畫面 ── */}
        <section className="wrap grid items-center gap-10 pt-12 pb-16 md:grid-cols-[1fr_auto] md:gap-16 md:pt-16 md:pb-20">
          <div className="max-w-[620px]">
            <span className="label">街頭藝人・駐唱歌手・直播主</span>
            <h1 className="mt-3 text-[38px] leading-[1.12] font-extrabold tracking-tight md:text-[58px]">
              讓聽眾<br />點歌給你
            </h1>
            <p className="mt-5 text-[17px] leading-8 text-ink2 md:text-[19px]">
              聽眾掃你的碼，挑一首想聽的歌、寫一句話、付款。歌自動排進你的清單，
              大螢幕和直播畫面同步顯示。錢直接進你自己的帳戶——平台不經手，也不抽演出費。
            </p>
            <div className="mt-8">
              <Cta
                note={`免費建立，不綁約、不收月費。只有成交時收 ${fee}%。`}
                secondary={{ href: "/p/demo", label: "看聽眾會看到什麼" }}
              />
            </div>
          </div>
          <div className="relative mx-auto w-[260px] shrink-0 md:w-[300px]">
            <Phone src="/shots/fan-top-c.png" alt="聽眾在手機上看到的點歌頁：封面、現在正在唱的歌、歌單與打賞按鈕" />
            <span className="absolute -bottom-3 -left-6 hidden rounded-[10px] border-[1.5px] border-ink bg-now px-3 py-1.5 text-[13px] font-bold text-ink shadow-[0_6px_16px_-6px_rgba(21,20,18,.4)] md:block">
              聽眾看到的畫面
            </span>
          </div>
        </section>

        {/* ── 了解：整條流程，每一步都有畫面 ── */}
        <section className="wrap sec pb-16 md:pb-24" aria-labelledby="how">
          <Head
            id="how"
            eyebrow="怎麼運作"
            title="從掃碼到唱完，三個畫面講完"
            desc="沒有要你學新東西。開演按一下，剩下的都在你本來就會的流程裡。"
          />

          <div className="flex flex-col gap-14">
            <div className="grid items-center gap-8 md:grid-cols-[300px_1fr] md:gap-14">
              <Phone src="/shots/fan-menu-c.png" alt="聽眾在點歌頁瀏覽歌單，可以搜尋歌名、依語言分類，每首旁邊是點歌金額" className="mx-auto w-[240px] md:w-auto" />
              <div>
                <span className="num text-[15px] font-bold text-now">01</span>
                <h3 className="h2 mt-1">聽眾挑一首，付款</h3>
                <p className="mt-3 max-w-[520px] text-[16px] leading-8 text-ink2">
                  歌單是你自己設的，可以搜尋、分類，每首各自定價。聽眾不用下載 App、不用註冊，
                  挑完填一句想說的話就付款——信用卡、Apple Pay，或你自己的 LINE Pay 收款碼。
                </p>
              </div>
            </div>

            <div className="grid items-center gap-8 md:grid-cols-[1fr_300px] md:gap-14">
              <div className="md:order-1">
                <span className="num text-[15px] font-bold text-now">02</span>
                <h3 className="h2 mt-1">歌自動排進你的控制台</h3>
                <p className="mt-3 max-w-[520px] text-[16px] leading-8 text-ink2">
                  不用再盯聊天室、抄紙條、記在腦子裡。誰點了什麼、付了多少、想說什麼，
                  全部照順序排好。演出中單手操作：開始唱、唱完了、跳過，三顆按鈕而已。
                </p>
              </div>
              <Phone src="/shots/console-c.png" alt="表演者的演出控制台：正在唱的歌、點歌人的留言，以及排隊清單與開始唱、跳過按鈕" className="mx-auto w-[240px] md:order-2 md:w-auto" />
            </div>

            <div>
              <div className="mb-6 max-w-[560px]">
                <span className="num text-[15px] font-bold text-now">03</span>
                <h3 className="h2 mt-1">大螢幕與直播畫面同步</h3>
                <p className="mt-3 text-[16px] leading-8 text-ink2">
                  現在唱的是誰點的、他寫了什麼、今晚誰支持最多，全部即時顯示。
                  現場接螢幕或投影，線上直播就加進 OBS——那個被唸到名字的瞬間，是他下次還會再點的理由。
                </p>
              </div>
              <Screen src="/shots/bigscreen.png" alt="大螢幕畫面：正在唱的歌名、點歌人與他的留言、掃碼點歌的 QR、本場支持排行" />
            </div>
          </div>
        </section>

        {/* ── 感興趣：三種情境，對號入座 ── */}
        <section className="wrap sec pb-16 md:pb-24" aria-labelledby="kinds">
          <Head
            id="kinds"
            eyebrow="三種情境"
            title="你是哪一種？設定不一樣"
            desc="註冊時選一個，排隊上限、金額、歌單範本、要不要大螢幕，全部幫你設好。之後都能改。"
          />
          <div className="grid gap-5 md:grid-cols-3">
            {KINDS.map((k) => (
              <Link key={k.slug} href={`/for/${k.slug}`} className="card group flex flex-col gap-3 p-6 transition hover:border-ink">
                <span className="label">{k.name}</span>
                <strong className="text-[19px] leading-7 group-hover:underline">{k.pitch}</strong>
                <p className="small leading-7">{k.desc}</p>
                <span className="small mt-auto pt-2 text-ink3">
                  預設排隊 {k.maxQueue} 首・金額 {k.amounts.map((a) => `NT$${a}`).join("／")}
                </span>
                <span className="text-[14px] font-bold underline">看這個情境怎麼用 →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 感興趣：錢的疑慮一次解決 ── */}
        <section className="wrap sec pb-16 md:pb-24" aria-labelledby="money">
          <Head id="money" eyebrow="錢怎麼算" title="款項直接進你的帳戶，平台不經手" />
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            <div>
              <h3 className="h3">錢不經過我們</h3>
              <p className="small mt-2 leading-7">
                聽眾付給你，不是付給平台。可以用你自己的 LINE Pay、街口、轉帳收款碼，
                或接自己的刷卡金流。我們從頭到尾不碰這筆錢，也不會卡你的撥款。
              </p>
            </div>
            <div>
              <h3 className="h3">只收成交的 {fee}%</h3>
              <p className="small mt-2 leading-7">
                用點數預扣，成交才扣。不抽演出費、不收月費、不綁約。
                一個月收超過 NT${be.toLocaleString()} 的話，月費方案會更划算——
                <Link href="/pricing" className="underline">自己算一次</Link>。
              </p>
            </div>
            <div>
              <h3 className="h3">紀錄是你的資產</h3>
              <p className="small mt-2 leading-7">
                每一場演出、每一首被點的歌、每一位回來的聽眾，系統自動累積成你的演出紀錄。
                這是你自己填不出來的東西——接案報價時它會替你說話。
              </p>
            </div>
          </div>
        </section>

        {/* ── 信任：現在真的有人在用 ── */}
        {live.length > 0 && (
          <section className="wrap sec pb-16 md:pb-24" aria-labelledby="live">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 id="live" className="h2 flex items-center gap-2"><span className="dot-now" />現在正在用</h2>
              <span className="small">{live.length} 位演出中</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {live.map((l) => (
                <Link key={l.slug} href={`/p/${l.slug}`} className="tag tag-quiet !h-10 !px-4 !text-[15px]">
                  {l.name}・{l.city}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 轉化：方案 ── */}
        <section className="wrap sec pb-16 md:pb-24" aria-labelledby="plans">
          <Head id="plans" eyebrow="方案" title="免費就能用全部核心功能" desc="免費方案不是殘廢版。量大了再升級，而且是你自己算得出來的決定。" />
          <div className="grid gap-5 md:grid-cols-2">
            {PLANS.map((p) => (
              <div key={p.slug} className={`card flex flex-col gap-4 p-6 ${p.slug === "pro" ? "!border-ink" : ""}`}>
                <div>
                  <div className="flex items-baseline gap-2">
                    <strong className="text-[20px]">{p.name}</strong>
                    {p.slug === "pro" && <span className="tag tag-now">量大更划算</span>}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="num text-[38px] leading-none font-extrabold">NT${p.price}</span>
                    <span className="small">{p.priceNote}</span>
                  </div>
                  <p className="small mt-2">成交服務費 {(p.feeRate * 100).toFixed(0)}%・{p.pitch}</p>
                </div>
                <ul className="flex flex-col gap-1.5 text-[15px]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><span className="text-ok">✓</span>{f}</li>
                  ))}
                  {p.missing?.map((f) => (
                    <li key={f} className="flex gap-2 text-ink3"><span>—</span>{f}</li>
                  ))}
                </ul>
                <Link href={p.slug === "pro" ? "/pricing" : "/login"} className={`btn btn-block mt-auto ${p.slug === "pro" ? "btn-secondary" : "btn-primary"}`}>
                  {p.slug === "pro" ? "看方案細節" : "免費開始"}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── 轉化：常見疑問 ── */}
        <section className="wrap sec pb-16 md:pb-24" aria-labelledby="faq">
          <Head id="faq" eyebrow="常見問題" title="開始之前，你大概會想問" />
          <Faq
            items={[
              { q: "聽眾需要下載 App 或註冊嗎？", a: "不用。掃碼直接開網頁，挑歌、付款就結束。只有想追蹤你、下次收開演通知的人，才會用 LINE 登入一次。" },
              { q: "錢什麼時候進我的帳戶？", a: "看你用哪種收款。用你自己的 LINE Pay、街口收款碼，聽眾是直接轉給你，我們完全不經手。接自己的刷卡金流，就照金流商的撥款週期走。平台不會卡你的錢。" },
              { q: `那 ${fee}% 的服務費怎麼收？`, a: "從點數餘額扣，成交才扣。註冊送新手點數，用完可以儲值。沒點數時會暫停接單，不會讓你欠錢。" },
              { q: "我沒有大螢幕也能用嗎？", a: "可以。街頭情境預設就不開大螢幕，只要一張印好的 QR 立牌。大螢幕是駐唱和直播才需要的。" },
              { q: "我在 YouTube 直播，這個怎麼接？", a: "把點歌連結放進直播描述，OBS 加一個瀏覽器來源就會顯示現在這首和排隊。我們不碰你的直播畫面，也不要求你換平台。" },
              { q: "可以隨時停用嗎？資料會被鎖住嗎？", a: "可以隨時停。演出紀錄和歌單都能匯出帶走。不綁約，也沒有解約金。" },
            ]}
          />
        </section>

        {/* ── 轉化＋跟進 ── */}
        <section className="wrap sec pb-20 md:pb-28">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-[26px] leading-tight font-extrabold tracking-tight md:text-[34px]">下一場就能用</h2>
              <p className="mt-3 max-w-[460px] text-[16px] leading-8 text-ink2">
                註冊只要選一個情境、填一個名字，歌單範本和金額都幫你設好。
                印一張 QR 立牌，今晚就能讓人點歌。
              </p>
              <div className="mt-7">
                <Cta note="不用信用卡，不綁約。" secondary={{ href: "/pricing", label: "先看方案" }} />
              </div>
            </div>
            <Lead />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
