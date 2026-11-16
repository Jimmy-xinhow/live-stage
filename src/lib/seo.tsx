import { env, APP_NAME } from "./env";

export const absUrl = (path: string) => `${env.baseUrl}${path}`;

/** 輸出 JSON-LD 結構化資料 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absUrl(it.path) })),
  };
}

export function faqPage(qa: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}

/** 街頭演出 → schema.org MusicEvent（Google 活動搜尋結果需要地點與時間） */
export function showEvent(s: { startsAt: string; location: string; note?: string; name: string; slug: string; cityOfficial?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `${s.name} 街頭演出・${s.location}`,
    startDate: s.startsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: true,
    description: s.note || `${s.name} 在${s.location}的街頭演出，現場可掃碼看歌單點歌。`,
    location: { "@type": "Place", name: s.location, address: { "@type": "PostalAddress", addressLocality: s.cityOfficial ?? "", addressCountry: "TW" } },
    performer: { "@type": "PerformingGroup", name: s.name, url: absUrl(`/p/${s.slug}`) },
    organizer: { "@type": "PerformingGroup", name: s.name, url: absUrl(`/p/${s.slug}`) },
    url: absUrl(`/p/${s.slug}`),
  };
}

export const SITE_FAQ = [
  { q: "街頭藝人要申請金流才能用賞一下嗎？", a: "不用。上傳你平常用的 LINE Pay、街口或全支付收款碼就能開始。觀眾點歌後會拿到 4 碼點歌碼，轉帳時填在備註，你看到入帳按一下「已收到」，那首歌就排進隊伍。想收信用卡再串接自己的綠界或藍新。" },
  { q: "觀眾需要下載 App 嗎？", a: "不用。觀眾用手機相機或 LINE 掃描 QR Code 就會打開點歌頁，在 LINE 裡開啟還會自動帶入身分，可以追蹤藝人、收到開唱通知。" },
  { q: `${APP_NAME}怎麼收費？`, a: "不收月費。開通送 200 點，每筆成交的點歌或打賞扣金額的 3%（1 點 = 1 元），例如一晚收 3,000 元，服務費 90 元。款項直接進藝人自己的帳戶，平台不經手。" },
  { q: "觀眾點了我不會唱的歌怎麼辦？", a: "歌單由你自己建立，只放你會唱的歌；當天狀況不好的歌可以先關閉「可點」。真的無法演唱時可以在控制台按「跳過」，系統會通知觀眾，退款由你直接處理。" },
  { q: "街頭藝人翻唱需要著作權授權嗎？", a: "公開演唱他人歌曲屬於公開演出，街頭藝人可以向音樂著作權集體管理團體申請年度概括授權，例如 MÜST、ACMA 每年各 1,200 元、TMCA 每年 1,000 元。" },
  { q: "怎麼找到附近正在表演的街頭藝人？", a: "在賞一下的地區頁可以看到各縣市正在表演的藝人、演出地點與排隊狀況，也能看到即將演出的時間地點；追蹤藝人後，他開唱時會用 LINE 通知你。" },
];
