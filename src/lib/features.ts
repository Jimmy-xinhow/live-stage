/**
 * 功能開關。
 *
 * 2026-11 做了一次收斂：產品定位收回「給街頭與駐唱表演者的現場點歌台」這一條線，
 * 其餘功能先關掉。程式沒有刪，想開回來把對應的值改成 true 就好。
 *
 * 判斷要不要開回來的標準只有一個：**這能不能讓現場的那三分鐘更好？**
 * 不能的，就先留在這裡。
 *
 * 詳見專案文件「規劃/產品定位與收斂方案-v2.md」。
 */
export const FEATURES = {
  /** 邀約媒合、報價、演出後評價 */
  matching: false,
  /** 活動刊登、店家主辦帳號與後台 */
  events: false,
  /** 付費曝光版位與推薦表演者 */
  promote: false,
  /** 互動遊戲：問答、轉盤、賽道類、跨表演者 PK */
  games: false,
  /** 表演地圖 */
  map: false,
  /** 地區 × 類型的 SEO 著陸頁 */
  seoAreas: false,
  /** 公開的表演者搜尋與瀏覽 */
  discovery: false,
  /** 成就、獎勵、記憶卡 */
  rewards: false,
} as const;

export type Feature = keyof typeof FEATURES;

export function enabled(f: Feature) {
  return FEATURES[f];
}

/**
 * API 路由的守門。功能關閉時回 404（和頁面一致，不洩漏這個端點存在）。
 * 用法：`const off = featureGate("matching"); if (off) return off;`
 */
export function featureGate(f: Feature): Response | null {
  if (FEATURES[f]) return null;
  return new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
}
