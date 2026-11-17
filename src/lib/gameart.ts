/**
 * 遊戲美術資產。
 *
 * 現在全部的畫面都是程式畫的（SVG + CSS 材質），沒有外部圖檔。
 * 之後委外或用生圖工具做出來的美術，放進 public/art/ 再登記到這裡就會自動換上去，
 * 不用改任何一支遊戲元件——每個遊戲元件都是先問這裡有沒有圖，沒有才用程式畫的版本。
 *
 * 魔王要三張（對應三個血量階段），其餘各一張。規格與提示詞寫在
 * 專案文件〈遊戲美術資產規格〉。
 */
export type ArtKey =
  | "boss-full" | "boss-hurt" | "boss-down"
  | "castle" | "banner-a" | "banner-b" | "wheel-face" | "lock" | "lock-open";

/** 之後把檔名填進來就會生效，例如 "boss-full": "/art/boss-full.webp" */
const ART: Partial<Record<ArtKey, string>> = {};

export const art = (k: ArtKey) => ART[k] ?? null;

/** 魔王依血量比例取圖 */
export function bossArt(pct: number) {
  if (pct <= 0) return art("boss-down");
  return pct < 45 ? art("boss-hurt") : art("boss-full");
}
