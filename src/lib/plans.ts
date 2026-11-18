/**
 * 方案。依「用到哪些功能」分層，不是依「用多少量」。
 *
 * 為什麼這樣分：
 * 點歌收款是每個表演者都需要的，所以免費就給完整的，不做殘廢版——街頭藝人
 * 收入不穩，一開口要月費會直接勸退。真正該收錢的是那些只有一部分人用得到、
 * 而且我們花最多力氣做的東西：互動遊戲、跨表演者 PK、OBS 疊層、樂團拆帳。
 * 把遊戲放進免費方案等於把唯一的護城河當贈品送。
 *
 * 費率只降一次：免費 3%，付費一律 1%。
 * 本來想做成階梯式遞減，但算出來互動方案要月營業額八萬才靠費率回本——
 * 那根本不是人家升級的理由，講出來只會顯得在硬湊。所以誠實一點：
 * 第二層是「量大了划算」，第三、四層買的就是功能，方案頁上直接這樣寫。
 */

export type PlanSlug = "free" | "base" | "play" | "all";

export type Plan = {
  slug: PlanSlug;
  name: string;
  /** 一句話說這個方案是給誰的 */
  who: string;
  price: number;
  priceNote: string;
  feeRate: number;
  /** 這一層新解鎖的東西。免費方案是列出全部核心功能 */
  adds: string[];
  /** 對這層的人最有感的一句話 */
  hook: string;
};

export const PLANS: Plan[] = [
  {
    slug: "free",
    name: "免費",
    who: "剛開始，或一個月演出幾場",
    price: 0,
    priceNote: "不綁約，沒有月費",
    feeRate: 0.03,
    hook: "核心功能全部都有，不是試用版",
    adds: [
      "點歌、打賞、排隊、留言牆",
      "演出控制台與大螢幕",
      "QR 立牌與桌卡列印",
      "粉絲追蹤與開演 LINE 通知",
      "平台自動累積的演出紀錄",
      "款項直接進你的帳戶",
    ],
  },
  {
    slug: "base",
    name: "點歌台",
    who: "固定在接演出，要對帳也要經營",
    price: 299,
    priceNote: "每月，隨時可取消",
    feeRate: 0.01,
    hook: "月營業額過 NT$15,000，光費率就回本",
    adds: [
      "成交費 3% → 1%",
      "收入對帳明細匯出（報稅、跟店家核對）",
      "開演公告一鍵成圖，直接貼 IG 限動",
      "點歌頁移除平台標記，看起來是你自己的頁",
      "優先客服",
    ],
  },
  {
    slug: "play",
    name: "互動",
    who: "想讓觀眾參與，不只是聽完就走",
    price: 699,
    priceNote: "每月，隨時可取消",
    feeRate: 0.01,
    hook: "八款遊戲全開，這是別人沒有的",
    adds: [
      "兵團對戰、拔河大賽、歌曲賽跑",
      "攻城魔王戰、集氣解鎖",
      "猜歌王・鐵粉測驗（免費玩）",
      "命運轉盤（觀眾投稿、你審核）",
      "付費加成道具與專屬大螢幕畫面",
    ],
  },
  {
    slug: "all",
    name: "全部",
    who: "線上開播，或樂團、場館要分帳",
    price: 1290,
    priceNote: "每月，隨時可取消",
    feeRate: 0.01,
    hook: "一套系統取代你現在開的那一堆分頁",
    adds: [
      "跨表演者 PK 對戰，兩邊粉絲互相助攻",
      "OBS 疊層：點歌 QR、排隊、延遲指示",
      "YouTube、Twitch、Instagram Live 都能掛",
      "樂團拆帳：比例設定，各自只看到自己的",
      "多人帳號，團員各自登入",
      "場館與主辦端的場次管理",
    ],
  },
];

export const planBySlug = (s: string | null | undefined) => PLANS.find((p) => p.slug === s) ?? PLANS[0];

/** 有沒有付費。對帳匯出、公告成圖、移除平台標記這些經營工具的門檻 */
export const planIsPaid = (s: string | null | undefined) => planBySlug(s).slug !== "free";

/** 這個方案有沒有解鎖互動遊戲 */
export function planHasGames(s: string | null | undefined) {
  return planBySlug(s).slug === "play" || planBySlug(s).slug === "all";
}
/** 這個方案有沒有解鎖跨表演者 PK、OBS 疊層、拆帳這些 */
export function planHasPro(s: string | null | undefined) {
  return planBySlug(s).slug === "all";
}

/**
 * 這個月收 gmv 元，每個方案各要付多少（月費＋成交費）。
 * 方案頁拿來做試算，讓人自己看出什麼時候該升級。
 */
export function costOf(gmv: number) {
  return PLANS.map((p) => ({ plan: p, cost: Math.round(gmv * p.feeRate) + p.price }));
}

/**
 * 月營業額到多少，付月費就比留在免費便宜（進位到整千，講出來好記）。
 * 只有第二層有這個數字；再往上是買功能，沒有費率上的回本點，
 * 不要在頁面上硬掰一個。
 */
export function breakEven() {
  const [free, base] = PLANS;
  return Math.ceil(base.price / (free.feeRate - base.feeRate) / 1000) * 1000;
}

/** 這層是靠費率划算，還是靠功能才值得 */
export const boughtForFeatures = (slug: PlanSlug) => slug === "play" || slug === "all";
