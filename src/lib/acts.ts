/** 表演類型：前台分類、搜尋與收錄頁（縣市×類型）都用這份 */
export type Act = { slug: string; name: string; hint: string };

export const ACTS: Act[] = [
  { slug: "busker", name: "街頭藝人", hint: "現場點歌、打賞" },
  { slug: "singer", name: "駐唱歌手", hint: "餐廳、酒吧、婚宴" },
  { slug: "band", name: "樂團", hint: "婚禮、尾牙、活動" },
  { slug: "dj", name: "DJ", hint: "派對、開幕" },
  { slug: "magic", name: "魔術", hint: "親子、近距離、舞台" },
  { slug: "dance", name: "舞蹈", hint: "街舞、民俗、肚皮舞" },
  { slug: "mc", name: "主持", hint: "婚禮、尾牙、記者會" },
  { slug: "instrument", name: "樂器演奏", hint: "鋼琴、小提琴、薩克斯風" },
  { slug: "acrobat", name: "特技雜耍", hint: "扯鈴、火舞、氣球" },
  { slug: "comedy", name: "脫口秀", hint: "商演、開放麥" },
];
export const actBySlug = (slug: string | null | undefined) => ACTS.find((a) => a.slug === slug) ?? null;
export const actName = (slug: string | null | undefined) => actBySlug(slug)?.name ?? "表演者";

export const OCCASIONS = ["婚禮", "尾牙春酒", "餐廳酒吧", "企業活動", "生日派對", "市集活動", "校園活動", "其他"];
export const BUDGETS = ["NT$5,000 以下", "NT$5,000–15,000", "NT$15,000–30,000", "NT$30,000 以上", "想先看報價"];
export const GUESTS = ["50 人以下", "51–150 人", "151–300 人", "300 人以上"];

/** 直播平台：完整模式可在畫面上放掃碼與支持提示；安全模式的平台限制把觀眾導到站外 */
export type StreamInfo = { platform: string; name: string; safe: boolean; embed: string | null };
export function streamInfo(url: string | null | undefined): StreamInfo | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const h = u.hostname.replace(/^www\./, "");
  if (h === "youtube.com" || h === "youtu.be" || h === "m.youtube.com") {
    const id = h === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop() ?? "";
    return { platform: "youtube", name: "YouTube", safe: false, embed: /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null };
  }
  if (h === "twitch.tv") {
    const ch = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return { platform: "twitch", name: "Twitch", safe: false, embed: /^\w{2,30}$/.test(ch) ? `https://player.twitch.tv/?channel=${ch}&parent=${"{host}"}` : null };
  }
  if (h.endsWith("facebook.com") || h === "fb.watch") return { platform: "facebook", name: "Facebook", safe: false, embed: null };
  if (h.endsWith("instagram.com")) return { platform: "instagram", name: "Instagram", safe: false, embed: null };
  if (h.endsWith("tiktok.com")) return { platform: "tiktok", name: "TikTok", safe: true, embed: null };
  if (h === "17.live" || h.endsWith("17.live")) return { platform: "17live", name: "17LIVE", safe: true, embed: null };
  return { platform: "other", name: h, safe: false, embed: null };
}
