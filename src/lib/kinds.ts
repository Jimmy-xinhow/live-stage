/**
 * 情境型態與演出模式。
 *
 * 同一條迴圈（掃碼／開連結 → 點歌 → 付款 → 排隊 → 演出 → 紀錄）對所有表演者都一樣，
 * 不一樣的只是預設值、用語與預設開啟的介面。所以這裡是設定檔，不是新功能。
 *
 * 詳見專案文件「規劃/產品定位與收斂方案」v5 第四、五節。
 */

export type KindSlug = "street" | "venue" | "streamer";
export type ModeSlug = "onsite" | "outdoor" | "indoor";

export type Kind = {
  slug: KindSlug;
  name: string;
  /** 首頁情境卡上的一句話 */
  pitch: string;
  /** 情境卡說明 */
  desc: string;
  /** 預設的演出模式 */
  defaultMode: ModeSlug;
  /** 可以選的模式 */
  modes: ModeSlug[];
  /** 排隊上限預設 */
  maxQueue: number;
  /** 金額預設值 */
  amounts: number[];
  /** 大螢幕預設開啟 */
  bigScreen: boolean;
  /** 立牌樣式：standee（直立小卡）| table（桌卡）| none（線上不需要） */
  poster: "standee" | "table" | "none";
  /** 這個型態用得到的後台設定 */
  shows: {
    payCode: boolean;    // 個人收款碼（線上用不到）
    gateway: boolean;    // 刷卡金流
    split: boolean;      // 樂團拆帳
    venueReport: boolean; // 與店家對帳
    stream: boolean;     // 直播設定與 overlay
    location: boolean;   // 演出地點
  };
  /** 歌單範本 */
  menu: { title: string; subtitle: string; category: string; price: number }[];
};

const MENU_STREET = [
  ["晴天", "周杰倫", "華語", 100],
  ["小幸運", "田馥甄", "華語", 100],
  ["島嶼天光", "滅火器", "台語", 100],
  ["童話", "光良", "華語", 100],
  ["後來", "劉若英", "華語", 100],
  ["家後", "江蕙", "台語", 150],
  ["安可一首（你指定）", "我會盡量唱", "指定", 200],
] as const;

const MENU_VENUE = [
  ["小幸運", "田馥甄", "華語", 100],
  ["Perfect", "Ed Sheeran", "西洋", 100],
  ["如果可以", "韋禮安", "華語", 100],
  ["漂向北方", "黃明志", "華語", 100],
  ["Shape of You", "Ed Sheeran", "西洋", 100],
  ["家後", "江蕙", "台語", 150],
  ["指定歌曲（歌單沒有的）", "我會試試看", "指定", 300],
  ["生日快樂＋現場喊名字", "幫壽星慶生", "服務", 200],
] as const;

const MENU_STREAM = [
  ["晴天", "周杰倫", "華語", 100],
  ["小幸運", "田馥甄", "華語", 100],
  ["Perfect", "Ed Sheeran", "西洋", 100],
  ["夜に駆ける", "YOASOBI", "日韓", 150],
  ["指定歌曲（歌單沒有的）", "我會試試看", "指定", 300],
  ["唸一段你寫的話", "上麥唸出來", "服務", 150],
  ["合唱一首", "一起唱", "服務", 300],
] as const;

const menu = (rows: readonly (readonly [string, string, string, number])[]) =>
  rows.map(([title, subtitle, category, price]) => ({ title, subtitle, category, price }));

export const KINDS: Kind[] = [
  {
    slug: "street",
    name: "街頭・市集",
    pitch: "我在街頭、市集表演",
    desc: "路人停下來聽幾分鐘，掃你的立牌 QR 就能點歌。重點是讓他們聽完還記得你——點過歌的人可以追蹤，你下次開唱他們會收到 LINE 通知。",
    defaultMode: "onsite",
    modes: ["onsite", "outdoor"],
    maxQueue: 5,
    amounts: [50, 100, 200],
    bigScreen: false,
    poster: "standee",
    shows: { payCode: true, gateway: true, split: false, venueReport: false, stream: false, location: true },
    menu: menu(MENU_STREET),
  },
  {
    slug: "venue",
    name: "駐唱・樂團",
    pitch: "我在餐廳、酒吧駐唱，或我們是樂團",
    desc: "客人坐著吃飯喝酒，一待就是一兩個小時。桌卡 QR 讓他們隨時點歌，大螢幕顯示現在這首是誰點的。月底可以匯出明細跟店家對帳，樂團可以設定拆帳比例。",
    defaultMode: "onsite",
    modes: ["onsite", "outdoor", "indoor"],
    maxQueue: 15,
    amounts: [100, 200, 500],
    bigScreen: true,
    poster: "table",
    shows: { payCode: true, gateway: true, split: true, venueReport: true, stream: true, location: true },
    menu: menu(MENU_VENUE),
  },
  {
    slug: "streamer",
    name: "線上直播",
    pitch: "我在 YouTube、Twitch 直播",
    desc: "把點歌從聊天室的混亂變成有序排隊。觀眾點的歌直接排進清單，OBS 畫面上同步顯示。平台抽三成到五成，我們只收 3%。",
    defaultMode: "indoor",
    modes: ["indoor", "outdoor"],
    maxQueue: 20,
    amounts: [100, 200, 500],
    bigScreen: false,
    poster: "none",
    shows: { payCode: false, gateway: true, split: true, venueReport: false, stream: true, location: false },
    menu: menu(MENU_STREAM),
  },
];

export const kindBySlug = (s: string | null | undefined) => KINDS.find((k) => k.slug === s) ?? KINDS[0];

export type Mode = { slug: ModeSlug; name: string; desc: string; games: "song" | "full" };

export const MODES: Mode[] = [
  { slug: "onsite", name: "純現場", desc: "只有現場的聽眾", games: "song" },
  { slug: "outdoor", name: "現場＋直播", desc: "現場演出同時開播", games: "song" },
  { slug: "indoor", name: "線上直播", desc: "觀眾都在線上看直播", games: "full" },
];

export const modeBySlug = (s: string | null | undefined) => MODES.find((m) => m.slug === s) ?? MODES[0];

/**
 * 對戰、派兵、團體戰這類會推升花費的互動，只在室內直播開。
 * 街頭的人站三到十分鐘、注意力在表演者身上；直播觀眾看三十分鐘到兩小時，
 * 螢幕本身就是場地——同一個機制在兩邊的結果完全相反。
 */
export const allowsBattleGames = (mode: string | null | undefined) => mode === "indoor";

/** 直播平台白名單。17Live、Pots 這類禁止站外付款導流，支援它們會害表演者被停權 */
export const STREAM_PLATFORMS = [
  { slug: "youtube", name: "YouTube" },
  { slug: "twitch", name: "Twitch" },
  { slug: "instagram", name: "Instagram Live" },
  { slug: "self", name: "自架或其他" },
] as const;
