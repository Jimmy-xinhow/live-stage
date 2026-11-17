/**
 * 方案。收斂後的商業模式：免費就能用全部核心功能，只在成交時抽 3%；
 * 量大的人改付月費把成交費降到 1%，並解鎖對帳、拆帳、公告成圖這些經營工具。
 *
 * 設計原則：免費方案不是殘廢版。街頭藝人收入不穩，一開口就要月費會直接勸退；
 * 等他一個月收到一定金額，月費自然划算，這時升級是他自己算得出來的決定。
 */

export type Plan = {
  slug: "free" | "pro";
  name: string;
  price: number;
  priceNote: string;
  feeRate: number;
  pitch: string;
  features: string[];
  missing?: string[];
};

export const PLANS: Plan[] = [
  {
    slug: "free",
    name: "免費",
    price: 0,
    priceNote: "不綁約，不收月費",
    feeRate: 0.03,
    pitch: "剛開始、或一個月演出幾場的人。核心功能全部都有。",
    features: [
      "點歌、打賞、排隊、留言牆",
      "演出控制台與大螢幕",
      "OBS 直播畫面同步",
      "QR 立牌與桌卡列印",
      "粉絲追蹤與開演 LINE 通知",
      "平台自動累積的演出紀錄",
    ],
    missing: ["對帳明細匯出", "樂團拆帳", "開演公告一鍵成圖", "自訂網址"],
  },
  {
    slug: "pro",
    name: "專業",
    price: 299,
    priceNote: "每月，可隨時取消",
    feeRate: 0.01,
    pitch: "固定駐唱、樂團、每週開播的人。成交費從 3% 降到 1%。",
    features: [
      "免費方案的全部功能",
      "成交服務費 3% → 1%",
      "收入對帳明細匯出（報稅、跟店家對帳）",
      "樂團拆帳：比例設定、各自看自己的金額",
      "開演公告一鍵成圖，直接貼 IG 限動",
      "自訂網址與移除頁尾平台標記",
      "優先客服",
    ],
  },
];

/** 月營業額多少以上，付月費比較划算（進位到整千，對外講才好記） */
export function breakEven() {
  const [free, pro] = PLANS;
  return Math.ceil(pro.price / (free.feeRate - pro.feeRate) / 1000) * 1000;
}

/** 這個月收 gmv 元，兩個方案各要付多少 */
export function costOf(gmv: number) {
  return PLANS.map((p) => ({ plan: p, cost: Math.round(gmv * p.feeRate) + p.price }));
}
