// 集中管理環境變數。伺服器端專用的值不要用 NEXT_PUBLIC_ 前綴。
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "現場";

export const env = {
  baseUrl: (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  /** 開發/展示用：允許「模擬付款」，正式環境務必關閉 */
  allowMock: process.env.ECPAY_ALLOW_MOCK === "true",
  /** 開發用：免 LINE Login 直接登入 demo 藝人與管理員 */
  allowDevLogin: process.env.DEV_LOGIN === "true",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me-32chars",
  encryptionKey: process.env.APP_ENCRYPTION_KEY ?? "dev-only-encryption-key-change-me",
  /** 管理後台密碼登入；沒設就只能用 ADMIN_LINE_USER_IDS 的 LINE 帳號進入 */
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminLineUserIds: (process.env.ADMIN_LINE_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  /** 平台自己的收款帳號：只用於藝人「購買點數」，與藝人收款無關 */
  platformGateway: {
    gateway: (process.env.PLATFORM_GATEWAY ?? "mock") as "mock" | "ecpay" | "newebpay",
    merchantId: process.env.PLATFORM_MERCHANT_ID ?? "",
    hashKey: process.env.PLATFORM_HASH_KEY ?? "",
    hashIV: process.env.PLATFORM_HASH_IV ?? "",
  },
  /** 金流環境：stage（測試）| production */
  paymentEnv: process.env.PAYMENT_ENV === "production" ? "production" : "stage",
  billing: {
    feeRate: Number(process.env.FEE_RATE ?? "0.03"),
    signupBonusCents: Number(process.env.SIGNUP_BONUS_POINTS ?? "200") * 100,
    /** 允許透支到負多少點才暫停接單，避免演出中途被卡 */
    overdraftCents: Number(process.env.OVERDRAFT_POINTS ?? "100") * 100,
    lowBalanceCents: Number(process.env.LOW_BALANCE_POINTS ?? "50") * 100,
    /** 開唱通知每位粉絲扣點（LINE 推播成本） */
    liveNotifyCents: Math.round(Number(process.env.LIVE_NOTIFY_POINTS ?? "0.2") * 100),
  },
  /** 直播聊天室：設了 YouTube Data API 金鑰才會啟用，沒設就整個功能關閉 */
  chat: {
    youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
    /** 每則聊天室留言加多少應援能量（百分比） */
    hypePerMessage: Number(process.env.CHAT_HYPE_PER_MESSAGE ?? "1"),
  },
  line: {
    loginChannelId: process.env.LINE_LOGIN_CHANNEL_ID ?? "",
    loginChannelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET ?? "",
    messagingAccessToken: process.env.LINE_MESSAGING_ACCESS_TOKEN ?? "",
    messagingChannelSecret: process.env.LINE_MESSAGING_CHANNEL_SECRET ?? "",
    oaAddFriendUrl: process.env.NEXT_PUBLIC_LINE_OA_URL ?? "",
  },
};

export const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export const POINT_PACKAGES = [
  { id: "p300", priceNt: 300, points: 300, label: "300 點" },
  { id: "p1000", priceNt: 1000, points: 1100, label: "1,100 點（送 100）" },
  { id: "p3000", priceNt: 3000, points: 3500, label: "3,500 點（送 500）" },
] as const;
