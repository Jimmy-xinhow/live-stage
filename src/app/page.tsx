import Link from "next/link";
import type { Metadata } from "next";
import { env } from "@/lib/env";
import { BRAND } from "@/lib/brand";
import { liveList } from "@/lib/discover";
import { JsonLd, absUrl } from "@/lib/seo";
import { Band, StageFooter, StageHeader } from "@/components/market/Shell";
import { LiveDemo } from "@/components/market/LiveDemo";
import { Lead } from "@/components/market/Lead";
import { Faq } from "@/components/market/Bits";
import { KINDS } from "@/lib/kinds";
import { PLANS, breakEven } from "@/lib/plans";
import { IconArrow, IconBell, IconChevron, IconLedger, IconQueue, IconRequest, IconScreen, IconStand, IconStream, IconStreet, IconTroops, IconVenue, IconWallet, IconWheel } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
 title: `${BRAND.name}｜${BRAND.tagline}`,
 description:
 "給街頭藝人、駐唱歌手與直播主的點歌台。聽眾掃碼點一首想聽的歌，歌自動排進你的清單，大螢幕與 OBS 同步顯示。款項直接進你的帳戶，平台不經手。免費方案不是試用版。",
 alternates: { canonical: "/" },
};

/** 一場演出實際的時間軸。寫成具體的事，不要寫成功能清單 */
const NIGHT = [
 { t: "20:05", h: "你把立牌放在吉他盒旁邊", p: "一張 A5 的 QR 立牌，上面是你的名字。沒有設備要接，沒有電要插。" },
 { t: "20:18", h: "第一個人掃了碼", p: "他翻你的歌單，挑了〈海闊天空〉，打了一句「我女朋友很喜歡這首」，付了 150。" },
 { t: "20:19", h: "歌進了你的排隊清單", p: "手機震一下。你彈完手上這首，低頭看一眼就知道下一首唱什麼、要唸誰的名字。" },
 { t: "20:46", h: "排到第四個人", p: "他在自己手機上看得到前面還有幾首，所以不會走過來問你「還要多久」。" },
 { t: "22:30", h: "收工", p: "今晚收了多少、誰點了什麼，已經記好了。那幾個人之中有三個按了追蹤，下次你開演他們會收到通知。" },
];

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
 name: BRAND.name,
 applicationCategory: "BusinessApplication",
 operatingSystem: "Web",
 url: absUrl("/"),
 description: "給街頭藝人、駐唱歌手與直播主的點歌台",
 offers: PLANS.map((p) => ({ "@type": "Offer", name: p.name, price: p.price, priceCurrency: "TWD" })),
 }}
 />
 <StageHeader />

 <main id="main">
 {/* 開場 */}
 <Band light="sodium" className="pt-14 pb-20 md:pt-20 md:pb-28">
 <div className="grid items-center gap-14 md:grid-cols-[1fr_auto]">
 <div>
 <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-3 py-1.5 cap text-[color:var(--dim)]">
 <i className="livedot" />
 街頭、駐唱樂團、線上直播都能用
 </span>
 <h1 className="d1 mt-5">
 讓聽眾<br />點歌給你
 </h1>
 <p className="lede mt-6">
 聽眾掃你的碼，挑一首想聽的歌、寫一句話、付款。歌自動排進你的清單，
 大螢幕和直播畫面同步亮出來。錢直接進你自己的帳戶——我們不經手，也不抽演出費。
 </p>
 <div className="mt-9 flex flex-wrap items-center gap-3">
 <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁<IconArrow size={19} /></Link>
 <Link href="/p/demo" className="sbtn sbtn-ghost">看聽眾會看到什麼</Link>
 </div>
 <p className="mt-4 cap text-[color:var(--dim)]">
 免費方案不是試用版，核心功能全部都有，只在成交時收 {fee}%。
 </p>
 </div>
 <LiveDemo />
 </div>
 </Band>

 {/* 大螢幕滿版 */}
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
 <Link href="/for/venue" className="inline-flex min-h-[44px] items-center gap-1.5 font-bold transition-opacity hover:opacity-70">駐唱與樂團怎麼用<IconChevron size={16} /></Link>
 </div>
 </Band>

 {/* 一個晚上實際怎麼跑 */}
 <Band light="wash" id="how" className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <div className="max-w-[820px]">
 <h2 className="d2">一個晚上，實際上長這樣</h2>
 <p className="body mt-4">不用學新東西。你本來就會做的事，只是多了一張立牌。</p>
 <ol className="mt-12 flex flex-col gap-0">
 {NIGHT.map((n, i) => (
 <li key={n.t} className="grid grid-cols-[62px_minmax(0,1fr)] gap-x-5 md:grid-cols-[88px_minmax(0,1fr)] md:gap-x-9">
 <div className="num pt-0.5 font-bold text-[color:var(--sodium)]">{n.t}</div>
 <div className={`border-l border-[color:var(--line)] pb-9 pl-6 md:pl-8 ${i === NIGHT.length - 1 ? "!border-transparent !pb-0" : ""}`}>
 <h3 className="t1 leading-7 font-black">{n.h}</h3>
 <p className="body mt-2 !max-w-[46ch]">{n.p}</p>
 </div>
 </li>
 ))}
 </ol>
 </div>
 </Band>

 {/* 兩端的真實畫面 */}
 <Band className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <div className="grid items-center gap-10 md:grid-cols-[300px_1fr] md:gap-16">
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

 {/* 互動遊戲 */}
 <Band light="wash" className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <h2 className="d2">八款遊戲，<br className="md:hidden" />讓觀眾從聽完就走變成想看結果</h2>
 <p className="body mt-5 !max-w-[58ch]">
 這些不是為了好玩而好玩。觀眾一旦加入了一場正在跑的遊戲，就會留下來看結果，
 而停留時間就是你的收入。每一款都有自己的畫面，接上投影機或 OBS 就是現場的背景。
 </p>

 <div className="mt-12 grid gap-6 md:grid-cols-2">
 {[
 { icon: <IconWheel size={24} />, src: "/shots/game-wheel.png", h: "命運轉盤", p: "觀眾投稿想看你做的事，你審核過才會上盤。按下去真的會轉，指針停在哪就做哪一個。轉盤上是表演，不是獎品。", alt: "大螢幕上的命運轉盤，五個觀眾投稿的挑戰分成五個扇形，指針停在其中一個，右邊顯示轉到的結果" },
 { icon: <IconTroops size={24} />, src: "/shots/game-battle.png", h: "兵團對戰", p: "觀眾分兩隊，免費點擊助攻，也可以派付費單位加大戰力。兩軍貼著戰線互推，時間到戰力高的那隊決定你唱什麼。", alt: "大螢幕上的兵團對戰，兩隊戰力數字、中間的戰線與兩側堆積的旗子，下方是各隊貢獻前三名" },
 { icon: <IconTroops size={24} />, src: "/shots/game-tug.png", h: "拔河大賽", p: "最單純也最吵的一款。兩隊狂點手機，繩結往贏的那邊移動，拉過勝利線就結束。", alt: "大螢幕上的拔河大賽，一條有繩結的繩子、兩側的勝利線，以及兩隊的分數與貢獻者" },
 { icon: <IconScreen size={24} />, src: "/shots/game-siege.png", h: "攻城魔王戰", p: "全場合作打一個魔王。血量會掉、城牆會裂、魔王的表情會變。打倒了就解鎖你先講好的那件事。", alt: "大螢幕上的攻城魔王戰，魔王與城牆圖像、下方是正在減少的血條與攻城者排行" },
 ].map((g) => (
 <figure key={g.src} className="flex flex-col gap-4">
 <div className="pane overflow-hidden">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={g.src} alt={g.alt} className="block w-full" />
 </div>
 <figcaption>
 <h3 className="t1 font-black">{g.h}</h3>
 <p className="body mt-1.5 !max-w-[44ch]">{g.p}</p>
 </figcaption>
 </figure>
 ))}
 </div>

 <div className="mt-14 grid items-center gap-10 md:grid-cols-[260px_1fr] md:gap-14">
 <div className="glow-phone mx-auto w-[210px] overflow-hidden md:w-full">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src="/shots/game-fan.png" alt="觀眾手機上的對戰畫面：選邊加入後的大顆派兵按鈕、冷卻倒數，以及騎士、投石車、巨龍三種付費加成" className="block w-full" />
 </div>
 <div>
 <h3 className="d3">觀眾那一端</h3>
 <p className="body mt-3">
 掃碼、選邊、按下去。按鈕會震、分數會往上飄，手機跟大螢幕是同一組隊伍顏色，
 抬頭就知道自己站哪邊。想出更多力就派兵——付了錢的那一下，名字會上大螢幕。
 </p>
 <p className="mt-5 leading-7 text-[color:var(--dim)]">
 另外還有歌曲賽跑、集氣解鎖、猜歌王・鐵粉測驗，以及跟另一位正在開播的表演者對決的跨表演者 PK。
 </p>
 </div>
 </div>

 <div className="mt-12 grid gap-x-12 gap-y-9 border-t border-[color:var(--line)] pt-10 md:grid-cols-3">
 <div>
 <h3 className="t1 flex items-center gap-2.5 font-black"><IconWallet size={22} className="shrink-0 text-[color:var(--sodium)]" />花費有上限</h3>
 <p className="body mt-2.5">
 同一位觀眾在同一場有累計上限，超過會被擋下來並告訴他還剩多少。
 衝動花過頭、隔天要求退款，走掉的是你，所以這條寫死在系統裡。
 </p>
 </div>
 <div>
 <h3 className="t1 flex items-center gap-2.5 font-black"><IconLedger size={22} className="shrink-0 text-[color:var(--sodium)]" />不是賭博</h3>
 <p className="body mt-2.5">
 遊戲結果只決定表演內容，沒有獎金、沒有抽獎，付費加成在該場結束後不保留。
 轉盤上的項目是觀眾投稿、你審核，觀眾不會拿到任何獎品。
 </p>
 </div>
 <div>
 <h3 className="t1 flex items-center gap-2.5 font-black"><IconStreet size={22} className="shrink-0 text-[color:var(--sodium)]" />街頭不會出現這些</h3>
 <p className="body mt-2.5">
 站著聽三分鐘的人不會想玩遊戲。對戰類只在線上直播模式打開，
 街頭場的手機就只是付款工具，不會多一層東西擋在你跟聽眾之間。
 </p>
 </div>
 </div>
 </Band>

 {/* 為什麼不是一張收款碼就好 */}
 <Band className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <div className="max-w-[760px]">
 <h2 className="d2">「我放一張收款碼就好了，不是嗎？」</h2>
 <p className="body mt-5">
 收款碼免費、你已經有了、也真的收得到錢。所以我們不跟它比收款，比的是它做不到的三件事。
 </p>
 <div className="mt-10 flex flex-col gap-8">
 <div>
 <h3 className="t1 flex items-center gap-2.5 font-black"><IconRequest size={22} className="shrink-0 text-[color:var(--sodium)]" />收款碼不知道那筆錢是點哪首歌</h3>
 <p className="body mt-2">
 有人轉了 150 塊，然後在旁邊喊了一首歌名。你在彈吉他，沒聽清楚，也沒辦法一邊彈一邊開 App 看是誰轉的。
 {BRAND.name}把金額、歌名、留言、人綁在一起，下一首唱什麼就在你面前。
 </p>
 </div>
 <div>
 <h3 className="t1 flex items-center gap-2.5 font-black"><IconQueue size={22} className="shrink-0 text-[color:var(--sodium)]" />收款碼沒有排隊</h3>
 <p className="body mt-2">
 三個人同時點，誰先誰後？用收款碼你得自己記、自己喬，記錯還會被嫌。
 排隊是自動的，誰在等、等幾首，聽眾在自己手機上看得到，不會一直過來問你。
 </p>
 </div>
 <div>
 <h3 className="t1 flex items-center gap-2.5 font-black"><IconBell size={22} className="shrink-0 text-[color:var(--sodium)]" />收款碼結束就結束了</h3>
 <p className="body mt-2">
 那個轉了 150 塊的人，下次你在哪演出他不會知道。
 {BRAND.name}會問他要不要追蹤，你下次開演他的 LINE 就收到通知。
 一年下來這些人累積起來是你自己的聽眾名單，要帶走隨時可以匯出。
 </p>
 </div>
 </div>
 <p className="mt-9 leading-8">
 如果你一個月只演兩三場，老實說收款碼就夠了——那就用免費方案，不用升級也能收錢。
 會需要付費的是一週演三場、開始要報稅、開始有固定聽眾來找你的人。
 <Link href="/pricing" className="ml-1 underline underline-offset-4 transition-opacity hover:opacity-70">費用怎麼算</Link>
 </p>
 </div>
 </Band>

 {/* 三種情境 */}
 <Band light="haze" className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <h2 className="d2">你是哪一種？</h2>
 <p className="body mt-4">註冊時選一個，排隊上限、金額、歌單範本、要不要大螢幕，全部幫你設好。之後都能改。</p>
 <div className="mt-10 grid gap-5 md:grid-cols-3">
 {KINDS.map((k, i) => (
 <Link
 key={k.slug}
 href={`/for/${k.slug}`}
 className={`pane group flex flex-col gap-3 p-6 transition hover:border-[color:var(--sodium)] ${i === 1 ? "pane-lit" : ""}`}
 >
 <strong className="t1 leading-7">{k.pitch}</strong>
 <p className="leading-7 text-[color:var(--dim)]">{k.desc}</p>
 <span className="mt-auto pt-3 cap text-[color:var(--dim)]">
 排隊 {k.maxQueue} 首　金額 NT${k.amounts.join(" / NT$")}
 </span>
 <span className="font-bold text-[color:var(--sodium)] group-hover:underline">{k.name}怎麼用</span>
 </Link>
 ))}
 </div>
 </Band>

 {/* 錢 */}
 <Band className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <h2 className="d2">款項直接進你的帳戶</h2>
 <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-3">
 <div>
 <IconWallet size={28} className="text-[color:var(--sodium)]" />
              <h3 className="d3 mt-3">錢不經過我們</h3>
 <p className="body mt-3">
 聽眾付給你，不是付給平台。可以用你自己的 LINE Pay、街口、轉帳收款碼，
 或接自己的刷卡金流。我們從頭到尾不碰這筆錢，也不會卡你的撥款。
 </p>
 </div>
 <div>
 <IconRequest size={28} className="text-[color:var(--sodium)]" />
              <h3 className="d3 mt-3">只收成交的 {fee}%</h3>
 <p className="body mt-3">
 用點數預扣，成交才扣。不抽演出費、不收開辦費、不綁約。
 一個月收超過 NT${be.toLocaleString()}，付月費的方案就比較便宜——
 <Link href="/pricing" className="underline underline-offset-4 transition-opacity hover:opacity-70">自己拉一次試算</Link>。
 </p>
 </div>
 <div>
 <IconLedger size={28} className="text-[color:var(--sodium)]" />
              <h3 className="d3 mt-3">紀錄是你的資產</h3>
 <p className="body mt-3">
 每一場演出、每一首被點的歌、每一位回來的聽眾，系統自動累積。
 這是你自己填不出來的東西——接案報價時它會替你說話，而且隨時可以匯出帶走。
 </p>
 </div>
 </div>
 </Band>

 {/* 現在正在用 */}
 {live.length > 0 && (
 <Band className="rule pt-16 pb-16 md:pt-20 md:pb-20">
 <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
 <h2 className="flex items-center gap-2.5 t1 font-bold"><i className="livedot" />現在正在用</h2>
 {live.map((l) => (
 <Link key={l.slug} href={`/p/${l.slug}`} className="inline-flex min-h-[44px] items-center rounded-full border border-[color:var(--line)] px-4 text-[color:var(--dim)] transition-colors hover:border-[color:var(--sodium)] hover:text-[color:var(--bone)]">
 {l.name}　{l.city}
 </Link>
 ))}
 </div>
 </Band>
 )}

 {/* 方案 */}
 <Band className="rule pt-20 pb-20 md:pt-24 md:pb-28">
 <h2 className="d2">依你用到哪些功能收費</h2>
 <p className="body mt-4 !max-w-[56ch]">
 免費那層不是殘廢版，點歌收款完整給。
 付費方案另外解鎖只有一部分人用得到的東西——要對帳的、要互動遊戲的、要線上 PK 和樂團分帳的。
 </p>
 <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
 {PLANS.map((p) => (
 <div key={p.slug} className={`pane flex flex-col gap-4 p-6 ${p.slug === "play" ? "pane-lit" : ""}`}>
 <div>
 <strong className="t1">{p.name}</strong>
 <p className="mt-1 cap leading-5 text-[color:var(--dim)]">{p.who}</p>
 <div className="num mt-4 d2 leading-none font-black">NT${p.price.toLocaleString()}</div>
 <div className="mt-1.5 cap text-[color:var(--dim)]">{p.priceNote}・成交 {(p.feeRate * 100).toFixed(0)}%</div>
 </div>
 <p className="leading-7">{p.hook}</p>
 <Link href="/pricing" className="mt-auto inline-flex min-h-[44px] items-center gap-1.5 font-bold text-[color:var(--sodium)] transition-opacity hover:opacity-70">
 {p.name}包含什麼
 </Link>
 </div>
 ))}
 </div>
 <div className="mt-8">
 <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁<IconArrow size={19} /></Link>
 </div>
 </Band>

 {/* 常見問題 */}
 <Band className="rule pt-20 pb-20 md:pt-24 md:pb-24">
 <h2 className="d2">開始之前，你大概會想問</h2>
 <div className="mt-8 max-w-[780px]">
 <Faq
 dark
 items={[
 { q: "聽眾需要下載 App 或註冊嗎？", a: "不用。掃碼直接開網頁，挑歌、付款就結束。只有想追蹤你、下次收開演通知的人，才會用 LINE 登入一次。" },
 { q: "錢什麼時候進我的帳戶？", a: "看你用哪種收款。用你自己的 LINE Pay、街口收款碼，聽眾是直接轉給你，我們完全不經手。接自己的刷卡金流，就照金流商的撥款週期走。平台不會卡你的錢。" },
 { q: `那 ${fee}% 的服務費怎麼收？`, a: "從你的點數餘額扣，成交才扣。註冊送新手點數，用完可以儲值。沒點數時會先讓你小額透支，不會演到一半被中斷，也不會讓你欠一筆莫名其妙的錢。" },
 { q: "我沒有大螢幕也能用嗎？", a: "可以。街頭情境預設就不開大螢幕，只要一張印好的 QR 立牌。大螢幕是駐唱和直播才需要的。" },
 { q: "我在 YouTube 直播，這個怎麼接？", a: "把點歌連結放進直播描述，OBS 加一個瀏覽器來源就會顯示現在這首和排隊清單。我們不碰你的直播畫面，也不要求你換平台。" },
 { q: "互動遊戲每個人都能開嗎？", a: "遊戲要互動方案以上，而且只在線上直播模式打開。這是我們花最多力氣做的部分，所以沒有放進免費方案；但你可以跟我們說一聲，第一場演出免費開著試，覺得不值再關掉。" },
 { q: "我不會設定這些東西。", a: "註冊時回答兩個問題——你是哪一種表演、叫什麼名字——歌單範本、金額、排隊上限就都設好了。真的卡住寫信給我們，我們直接幫你設。" },
 { q: "可以隨時停用嗎？資料會被鎖住嗎？", a: "可以隨時停，不綁約也沒有解約金。演出紀錄、聽眾名單、歌單都能匯出帶走——我們不把你的聽眾當成我們的資產。" },
 ]}
 />
 </div>
 </Band>

 {/* 收尾 */}
 <Band light="sodium" className="rule pt-20 pb-24 md:pt-24 md:pb-32">
 <div className="grid gap-12 md:grid-cols-2 md:gap-16">
 <div>
 <h2 className="d2">下一場就能用</h2>
 <p className="body mt-4">
 註冊只要選一個情境、填一個名字，歌單範本和金額都幫你設好。
 印一張 QR 立牌，今晚就能讓人點歌。
 </p>
 <div className="mt-8 flex flex-wrap gap-3">
 <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁<IconArrow size={19} /></Link>
 <Link href="/pricing" className="sbtn sbtn-ghost">先看方案</Link>
 </div>
 <p className="mt-4 cap text-[color:var(--dim)]">不用信用卡，不綁約。</p>
 </div>
 <Lead dark />
 </div>
 </Band>
 </main>

 <StageFooter />
 </div>
 );
}
