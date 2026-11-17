import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, varchar, index, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export type PayMethod = {
  type: "linepay" | "jkopay" | "pxpay" | "other";
  label: string;
  /** 收款碼解碼後的內容（多半是網址，可直接點開付款） */
  qrText: string | null;
  /** 無法解碼時保留壓縮後的圖片 data URL */
  imageData: string | null;
};

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const performers = pgTable("performers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 40 }).notNull().unique(),
  lineUserId: varchar("line_user_id", { length: 64 }).unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio").notNull().default(""),
  category: varchar("category", { length: 20 }).notNull().default("busker"), // busker | service | creator | other
  /** 主要演出縣市（lib/areas.ts 的 slug），決定出現在哪個地區頁 */
  city: varchar("city", { length: 20 }),
  /** 行政區或常駐地點，例：鹽埕區・駁二 */
  district: varchar("district", { length: 30 }).notNull().default(""),
  themeColor: varchar("theme_color", { length: 9 }).notNull().default("#e8590c"),
  thankYouText: text("thank_you_text").notNull().default("謝謝你的支持！"),
  presetAmounts: jsonb("preset_amounts").$type<number[]>().notNull().default([50, 100, 200, 500]),
  minAmount: integer("min_amount").notNull().default(30),
  maxAmount: integer("max_amount").notNull().default(20000),
  showAmounts: boolean("show_amounts").notNull().default(false),
  notifyLine: boolean("notify_line").notNull().default(true),
  /** 免申請收款：藝人自己的 LINE Pay／街口等個人收款碼，觀眾轉帳後由藝人一鍵確認 */
  payMethods: jsonb("pay_methods").$type<PayMethod[]>().notNull().default([]),
  /** 選用的自動刷卡金流：none | mock（僅開發）| ecpay | newebpay。平台不經手款項 */
  gateway: varchar("gateway", { length: 10 }).notNull().default("none"),
  gatewayMerchantId: varchar("gateway_merchant_id", { length: 20 }),
  gatewayHashKeyEnc: text("gateway_hash_key_enc"),
  gatewayHashIvEnc: text("gateway_hash_iv_enc"),
  /** 點數餘額，單位：分（100 = 1 點 = NT$1） */
  pointsCents: integer("points_cents").notNull().default(0),
  lowBalanceNotifiedAt: ts("low_balance_notified_at"),
  /** 演出狀態 */
  liveSessionId: uuid("live_session_id"),
  queueOpen: boolean("queue_open").notNull().default(true),
  maxQueue: integer("max_queue").notNull().default(15),
  avgSongMinutes: integer("avg_song_minutes").notNull().default(4),
  status: varchar("status", { length: 12 }).notNull().default("active"), // active | suspended
  /** 表演類型（lib/acts.ts）：busker | singer | band | dj | magic | dance | mc | instrument | acrobat | comedy */
  actType: varchar("act_type", { length: 12 }).notNull().default("busker"),
  /** 情境型態（lib/kinds.ts）：street（街頭）| venue（駐唱／樂團）| streamer（線上直播）。決定預設值與後台顯示哪些設定 */
  kind: varchar("kind", { length: 10 }).notNull().default("street"),
  // 方案：free / base / play / all。見 lib/plans.ts
  plan: varchar("plan", { length: 10 }).notNull().default("free"),
  /** 線上直播平台，只有 kind=streamer 用：youtube | twitch | self | instagram */
  streamPlatform: varchar("stream_platform", { length: 12 }),
  /** 粉絲單場花費上限（分）。0 = 用系統預設 */
  fanCapCents: integer("fan_cap_cents").notNull().default(0),
  /** 對外邀約資訊（作品集頁） */
  bookable: boolean("bookable").notNull().default(true),
  priceFrom: integer("price_from"),
  occasions: jsonb("occasions").$type<string[]>().notNull().default([]),
  serviceAreas: jsonb("service_areas").$type<string[]>().notNull().default([]),
  genres: varchar("genres", { length: 60 }).notNull().default(""),
  coverUrl: text("cover_url"),
  videoUrl: text("video_url"),
  /** 這場直播的網址（表演者自己在 YouTube／Twitch 等平台開播） */
  streamUrl: text("stream_url"),
  overlayToken: varchar("overlay_token", { length: 24 }),
  /** 常駐地點的座標（可不填，不填就用縣市中心） */
  lat: text("lat"),
  lng: text("lng"),
  /** 帳號類型：performer 表演者｜organizer 店家或主辦（共用登入、點數與購點流程） */
  accountType: varchar("account_type", { length: 10 }).notNull().default("performer"),
  /** 店家主辦專用：類型（venue 餐廳酒吧｜organizer 活動主辦｜brand 品牌企業｜other）、地址、網站 */
  orgKind: varchar("org_kind", { length: 12 }).notNull().default("venue"),
  address: varchar("address", { length: 100 }).notNull().default(""),
  website: varchar("website", { length: 200 }).notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** 歌單／服務選單：只放藝人真的會的，民眾直接選 */
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 60 }).notNull(),
    subtitle: varchar("subtitle", { length: 60 }).notNull().default(""),
    category: varchar("category", { length: 20 }).notNull().default(""),
    price: integer("price").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("menu_items_performer_idx").on(t.performerId, t.sort)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 10 }).notNull(),
    /** 平台上的留言 id，用來避免重複寫入 */
    externalId: varchar("external_id", { length: 80 }).notNull(),
    author: varchar("author", { length: 40 }).notNull(),
    text: varchar("text", { length: 200 }).notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("chat_external_idx").on(t.sessionId, t.externalId), index("chat_session_idx").on(t.sessionId, t.createdAt)],
);

export const liveSessions = pgTable("live_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
  location: varchar("location", { length: 60 }).notNull().default(""),
  startedAt: ts("started_at").notNull().defaultNow(),
  endedAt: ts("ended_at"),
  notifiedCount: integer("notified_count").notNull().default(0),
  /** 應援能量（觀眾免費點按累積，100 滿） */
  hype: integer("hype").notNull().default(0),
  /** 演出模式：onsite（純現場）| outdoor（室外直播）| indoor（室內直播）。決定互動強度 */
  mode: varchar("mode", { length: 10 }).notNull().default("onsite"),
  /** 直播聊天室：平台、聊天室 id、下一頁 token、上次輪詢時間 */
  chatPlatform: varchar("chat_platform", { length: 10 }),
  chatId: varchar("chat_id", { length: 120 }),
  chatToken: varchar("chat_token", { length: 200 }),
  chatAt: ts("chat_at"),
});

export const fans = pgTable("fans", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineUserId: varchar("line_user_id", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 60 }).notNull().default(""),
  avatarUrl: text("avatar_url"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const follows = pgTable(
  "follows",
  {
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
    notifyLive: boolean("notify_live").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.performerId, t.fanId] })],
);

/** 點歌與打賞訂單（款項進藝人自己的金流帳戶） */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id"),
    kind: varchar("kind", { length: 10 }).notNull(), // request | tip
    menuItemId: uuid("menu_item_id"),
    itemTitle: varchar("item_title", { length: 60 }),
    tradeNo: varchar("trade_no", { length: 20 }).notNull().unique(),
    amount: integer("amount").notNull(),
    nickname: varchar("nickname", { length: 30 }).notNull().default(""),
    message: varchar("message", { length: 120 }).notNull().default(""),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    fanId: uuid("fan_id"),
    /** auto：綠界／藍新自動確認；manual：觀眾轉帳到藝人收款碼、藝人按確認 */
    payMode: varchar("pay_mode", { length: 10 }).notNull().default("auto"),
    /** 手動模式的 4 碼點歌碼，觀眾轉帳時填在備註 */
    payCode: varchar("pay_code", { length: 4 }),
    claimedAt: ts("claimed_at"),
    /** 付款確認後自動追蹤藝人（點歌表單預設勾選） */
    followOnPay: boolean("follow_on_pay").notNull().default(true),
    status: varchar("status", { length: 10 }).notNull().default("pending"), // pending（刷卡中）| awaiting（等藝人確認）| paid | failed | expired | refunded
    refundedAt: ts("refunded_at"),
    /** 誰退的：performer | admin */
    refundBy: varchar("refund_by", { length: 10 }),
    refundNote: varchar("refund_note", { length: 120 }),
    queueStatus: varchar("queue_status", { length: 10 }), // waiting | playing | done | skipped
    queueSeq: integer("queue_seq"),
    startedAt: ts("started_at"),
    finishedAt: ts("finished_at"),
    paymentType: varchar("payment_type", { length: 40 }),
    gatewayTradeNo: varchar("gateway_trade_no", { length: 40 }),
    paidAt: ts("paid_at"),
    feeCents: integer("fee_cents").notNull().default(0),
    reply: varchar("reply", { length: 200 }),
    repliedAt: ts("replied_at"),
    hidden: boolean("hidden").notNull().default(false),
    /** 互動遊戲的付費加成：付款確認後加到該遊戲的隊伍上 */
    gameId: uuid("game_id"),
    gameLane: integer("game_lane"),
    gameUnit: varchar("game_unit", { length: 12 }),
    rawNotify: jsonb("raw_notify"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("orders_performer_paid_idx").on(t.performerId, t.status, t.paidAt),
    index("orders_session_queue_idx").on(t.sessionId, t.queueStatus, t.queueSeq),
    index("orders_fan_idx").on(t.fanId),
    index("orders_awaiting_idx").on(t.performerId, t.status, t.payCode),
  ],
);

/** 演出預告：讓追蹤者知道下次去哪裡聽 */
export const shows = pgTable(
  "shows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    startsAt: ts("starts_at").notNull(),
    location: varchar("location", { length: 60 }).notNull(),
    note: varchar("note", { length: 120 }).notNull().default(""),
    notifiedCount: integer("notified_count").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("shows_performer_starts_idx").on(t.performerId, t.startsAt)],
);

/** 藝人自訂成就：粉絲累計支持達標就解鎖，可附獎勵 */
export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 20 }).notNull(),
    emoji: varchar("emoji", { length: 8 }).notNull().default("🏅"),
    /** total：累計支持金額；count：累計支持次數 */
    kind: varchar("kind", { length: 10 }).notNull().default("total"),
    threshold: integer("threshold").notNull(),
    reward: varchar("reward", { length: 100 }),
    /** 獎勵數量上限（null＝不限） */
    stock: integer("stock"),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("achievements_performer_idx").on(t.performerId)],
);

/** 粉絲達成的成就與獎勵領取狀態 */
export const fanAchievements = pgTable(
  "fan_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    achievementId: uuid("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
    /** unlocked：已達成 | requested：粉絲申請領取 | redeemed：藝人已兌換 */
    status: varchar("status", { length: 10 }).notNull().default("unlocked"),
    claimCode: varchar("claim_code", { length: 6 }),
    unlockedAt: ts("unlocked_at").notNull().defaultNow(),
    requestedAt: ts("requested_at"),
    redeemedAt: ts("redeemed_at"),
  },
  (t) => [uniqueIndex("fan_achievements_once").on(t.achievementId, t.fanId), index("fan_achievements_performer_idx").on(t.performerId, t.status)],
);

/** 點數帳本：每一筆增減都留紀錄 */
export const pointLedger = pgTable(
  "point_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    deltaCents: integer("delta_cents").notNull(),
    balanceAfterCents: integer("balance_after_cents").notNull(),
    reason: varchar("reason", { length: 20 }).notNull(), // signup_bonus | purchase | fee | fee_refund | live_notify | broadcast | adjust
    orderId: uuid("order_id"),
    purchaseId: uuid("purchase_id"),
    note: varchar("note", { length: 120 }).notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("point_ledger_performer_idx").on(t.performerId, t.createdAt), uniqueIndex("point_ledger_fee_once").on(t.orderId, t.reason)],
);

/** 藝人向平台購買點數（走星昊自己的金流） */
export const pointPurchases = pgTable("point_purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
  tradeNo: varchar("trade_no", { length: 20 }).notNull().unique(),
  packageId: varchar("package_id", { length: 20 }).notNull(),
  priceNt: integer("price_nt").notNull(),
  pointsCents: integer("points_cents").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("pending"),
  paidAt: ts("paid_at"),
  rawNotify: jsonb("raw_notify"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** 邀約需求：找表演的人送出，平台只轉達、不經手款項 */
export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
  contactName: varchar("contact_name", { length: 30 }).notNull(),
  occasion: varchar("occasion", { length: 20 }).notNull(),
  actType: varchar("act_type", { length: 12 }),
  eventDate: varchar("event_date", { length: 10 }).notNull(),
  timeText: varchar("time_text", { length: 40 }).notNull().default(""),
  city: varchar("city", { length: 20 }).notNull(),
  place: varchar("place", { length: 60 }).notNull().default(""),
  guests: varchar("guests", { length: 20 }).notNull().default(""),
  budget: varchar("budget", { length: 30 }).notNull().default(""),
  note: varchar("note", { length: 300 }).notNull().default(""),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const inquiryTargets = pgTable(
  "inquiry_targets",
  {
    inquiryId: uuid("inquiry_id").notNull().references(() => inquiries.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 10 }).notNull().default("new"), // new | quoted | declined
    quoteAmount: integer("quote_amount"),
    quoteNote: varchar("quote_note", { length: 300 }),
    repliedAt: ts("replied_at"),
    /** 邀請人在活動日之後留下的評價（只有收到報價的邀約可以評） */
    rating: integer("rating"),
    review: varchar("review", { length: 300 }),
    reviewedAt: ts("reviewed_at"),
    /** 平台隱藏不當評價（原評價保留，只是不顯示） */
    reviewHidden: boolean("review_hidden").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.inquiryId, t.performerId] }), index("inquiry_targets_performer_idx").on(t.performerId, t.status)],
);

/** 付費曝光：表演者用點數自助購買，前台一律標示 */
export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    slot: varchar("slot", { length: 12 }).notNull(), // search | home | event_top | event_home
    /** 活動版位才有 */
    eventId: uuid("event_id"),
    city: varchar("city", { length: 20 }).notNull(),
    actType: varchar("act_type", { length: 12 }).notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    costCents: integer("cost_cents").notNull(),
    /** 成效：版位被看到的次數與被點擊的次數 */
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("promotions_lookup_idx").on(t.slot, t.city, t.actType, t.endsAt)],
);

/** 簽到集章：每場每人一次 */
export const checkins = pgTable(
  "checkins",
  {
    sessionId: uuid("session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.fanId] }), index("checkins_fan_idx").on(t.fanId, t.performerId)],
);

/** 舉手：想合唱、想提問、想祝福 */
export const hands = pgTable(
  "hands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 6 }).notNull(), // sing | ask | wish
    text: varchar("text", { length: 80 }).notNull().default(""),
    status: varchar("status", { length: 8 }).notNull().default("waiting"), // waiting | picked
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("hands_session_idx").on(t.sessionId, t.status)],
);

/** 免費抽獎：資格是當場簽到，獎品由表演者提供 */
export const lotteries = pgTable("lotteries", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => liveSessions.id, { onDelete: "cascade" }),
  performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
  prize: varchar("prize", { length: 40 }).notNull(),
  status: varchar("status", { length: 6 }).notNull().default("open"), // open | drawn
  winnerFanId: uuid("winner_fan_id"),
  endsAt: ts("ends_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const lotteryEntries = pgTable(
  "lottery_entries",
  {
    lotteryId: uuid("lottery_id").notNull().references(() => lotteries.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.lotteryId, t.fanId] })],
);

/** 許願池：觀眾想聽、表演者還不會的歌 */
export const wishes = pgTable(
  "wishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 60 }).notNull(),
    status: varchar("status", { length: 8 }).notNull().default("open"), // open | practice | done
    votes: integer("votes").notNull().default(1),
    note: varchar("note", { length: 100 }).notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("wishes_performer_idx").on(t.performerId, t.status)],
);

export const wishVotes = pgTable(
  "wish_votes",
  {
    wishId: uuid("wish_id").notNull().references(() => wishes.id, { onDelete: "cascade" }),
    fanId: uuid("fan_id").notNull().references(() => fans.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.wishId, t.fanId] })],
);

/** 店家／主辦刊登的演出活動 */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 60 }).notNull(),
    city: varchar("city", { length: 20 }).notNull(),
    place: varchar("place", { length: 60 }).notNull(),
    address: varchar("address", { length: 100 }).notNull().default(""),
    lat: text("lat"),
    lng: text("lng"),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at"),
    description: varchar("description", { length: 800 }).notNull().default(""),
    priceText: varchar("price_text", { length: 40 }).notNull().default(""),
    link: varchar("link", { length: 300 }).notNull().default(""),
    coverUrl: text("cover_url"),
    /** 不在平台上的演出者，純文字 */
    guestActs: varchar("guest_acts", { length: 200 }).notNull().default(""),
    /** 被標記的表演者確認後，是否通知他的粉絲（費用由主辦的點數支付） */
    notifyFans: boolean("notify_fans").notNull().default(false),
    status: varchar("status", { length: 10 }).notNull().default("published"), // published | cancelled
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_time_idx").on(t.status, t.startsAt), index("events_org_idx").on(t.organizerId)],
);

/** 活動標記的平台表演者：對方確認後才公開顯示 */
export const eventPerformers = pgTable(
  "event_performers",
  {
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 10 }).notNull().default("pending"), // pending | confirmed | declined
    notified: integer("notified").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.performerId] }), index("event_performers_performer_idx").on(t.performerId, t.status)],
);

export type QuizQuestion = { q: string; options: string[]; answer: number };
export type QuizState = { idx: number; phase: "lobby" | "open" | "reveal"; openedAt: number; secs: number; players: Record<string, { name: string; score: number; picks: Record<string, number> }> };
export type WheelEntry = { id: string; fanId: string; name: string; text: string; status: "pending" | "approved" | "rejected" };
export type WheelState = { entries: WheelEntry[]; resultId: string | null; spunAt: number };

export type GameLane = { name: string; score: number; players: number };
export type GamePlayer = { name: string; lane: number; score: number; taps: number; last: number };
export type GameState = { lanes: GameLane[]; players: Record<string, GamePlayer>; feed: { t: number; text: string; lane: number }[]; winner: number | null; quiz?: QuizState; wheel?: WheelState };
export type GameConfig = { reward: string; goal: number; questions?: QuizQuestion[] };

/** 互動遊戲：battle 兵團對戰｜tug 拔河｜race 歌曲賽跑｜siege 攻城｜goal 集氣解鎖｜quiz 問答｜wheel 命運轉盤｜pk 跨表演者對戰 */
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    performerId: uuid("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
    /** 跨表演者 PK 時的對手；兩邊的頁面與大螢幕看到同一局 */
    opponentId: uuid("opponent_id").references(() => performers.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id"),
    type: varchar("type", { length: 8 }).notNull(),
    status: varchar("status", { length: 8 }).notNull().default("running"), // running | ended
    config: jsonb("config").$type<GameConfig>().notNull(),
    state: jsonb("state").$type<GameState>().notNull(),
    endsAt: ts("ends_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("games_performer_idx").on(t.performerId, t.status), index("games_opponent_idx").on(t.opponentId, t.status)],
);

/** 後台操作稽核：誰、在什麼時候、對誰做了什麼。只寫不改 */
export const adminLogs = pgTable(
  "admin_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 操作者：LINE user id，或用密碼登入時記 password */
    actor: varchar("actor", { length: 60 }).notNull(),
    /** suspend | activate | adjust_points | refund | hide_review | unhide_review | unpublish_event | publish_event */
    action: varchar("action", { length: 24 }).notNull(),
    /** 被操作的對象：performer / order / event / review 的 id */
    targetType: varchar("target_type", { length: 12 }).notNull(),
    targetId: uuid("target_id"),
    /** 對象的可讀名稱，方便事後查看（對象被刪也還看得到） */
    targetName: varchar("target_name", { length: 60 }).notNull().default(""),
    detail: varchar("detail", { length: 200 }).notNull().default(""),
    ip: varchar("ip", { length: 45 }).notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("admin_logs_at_idx").on(t.createdAt), index("admin_logs_target_idx").on(t.targetType, t.targetId)],
);

/** 內容檢舉：留言、作品頁、活動頁 */
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** order（留言牆）| performer（作品頁）| event（活動）| chat（聊天室） */
    targetType: varchar("target_type", { length: 12 }).notNull(),
    targetId: uuid("target_id").notNull(),
    /** 檢舉人（有登入才有） */
    fanId: uuid("fan_id").references(() => fans.id, { onDelete: "set null" }),
    reason: varchar("reason", { length: 20 }).notNull(), // spam | abuse | sexual | fake | other
    note: varchar("note", { length: 200 }).notNull().default(""),
    /** new | reviewed | dismissed */
    status: varchar("status", { length: 10 }).notNull().default("new"),
    handledAt: ts("handled_at"),
    ip: varchar("ip", { length: 45 }).notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt), index("reports_target_idx").on(t.targetType, t.targetId)],
);

/** 跟進名單：看了銷售頁但還沒註冊的人 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 120 }).notNull().unique(),
    /** 他自己說的情境：street | venue | streamer */
    kind: varchar("kind", { length: 10 }).notNull().default("street"),
    /** 寄過幾封跟進信 */
    sentCount: integer("sent_count").notNull().default(0),
    ip: varchar("ip", { length: 45 }).notNull().default(""),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("leads_at_idx").on(t.createdAt)],
);

export type Performer = typeof performers.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type AdminLog = typeof adminLogs.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Game = typeof games.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Fan = typeof fans.$inferSelect;
export type Show = typeof shows.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
