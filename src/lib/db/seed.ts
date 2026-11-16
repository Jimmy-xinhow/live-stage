import { eq } from "drizzle-orm";
import type { DB } from "./index";
import { fans, follows, liveSessions, menuItems, orders, performers, shows } from "./schema";
import { applyPoints, feeFor } from "../billing";
import { achievements } from "./schema";
import { ACHIEVEMENT_TEMPLATES, backfillAchievement } from "../rewards";

const SONGS: [string, string, string, number][] = [
  ["晴天", "周杰倫", "華語", 100],
  ["小幸運", "田馥甄", "華語", 100],
  ["稻香", "周杰倫", "華語", 100],
  ["說好不哭", "周杰倫", "華語", 100],
  ["愛你", "王心凌", "華語", 100],
  ["家後", "江蕙", "台語", 150],
  ["向前行", "林強", "台語", 150],
  ["Perfect", "Ed Sheeran", "英文", 150],
  ["Let It Be", "The Beatles", "英文", 150],
  ["生日快樂歌＋現場喊名字", "特別服務", "特別服務", 200],
  ["告白歌（幫你唱給他/她）", "特別服務", "特別服務", 500],
  ["一起合照＋簽名", "特別服務", "特別服務", 100],
];

export async function seedDemo(db: DB) {
  if ((await db.select({ id: performers.id }).from(performers).where(eq(performers.slug, "demo"))).length) return;
  const [p] = await db
    .insert(performers)
    .values({
      slug: "demo",
      lineUserId: "Udev-demo",
      displayName: "阿哲的街頭吉他",
      bio: "每週五六晚上在駁二大勇倉庫前，民謠、流行、台語老歌。歌單上的我都會唱，直接點！",
      category: "busker",
      actType: "busker", genres: "民謠、華語流行、台語老歌", priceFrom: 3000, occasions: ["餐廳酒吧", "市集活動", "生日派對"], serviceAreas: ["tainan", "pingtung"], overlayToken: "demo-overlay",
      city: "kaohsiung",
      district: "鹽埕區・駁二",
      lat: "22.6207", lng: "120.2807",
      thankYouText: "謝謝你停下腳步聽我唱歌，下週見",
      showAmounts: true,
      gateway: "mock",
      payMethods: [{ type: "linepay", label: "LINE Pay", qrText: "DEMO-這是示範用的收款碼", imageData: null }],
    })
    .returning();
  await applyPoints(db, p.id, 20000, "signup_bonus", { note: "新手贈點" });

  const items = await db
    .insert(menuItems)
    .values(SONGS.map(([title, subtitle, category, price], i) => ({ performerId: p.id, title, subtitle, category, price, sort: i, enabled: title !== "Let It Be" })))
    .returning();

  const fanRows = await db
    .insert(fans)
    .values([
      { lineUserId: "Udev-fan1", name: "小魚" },
      { lineUserId: "Udev-fan2", name: "Kevin" },
      { lineUserId: "Udev-fan3", name: "阿明" },
    ])
    .returning();
  await db.insert(follows).values(fanRows.map((f) => ({ performerId: p.id, fanId: f.id })));

  const [s] = await db.insert(liveSessions).values({ performerId: p.id, location: "駁二大勇倉庫 C5 前" }).returning();
  await db.update(performers).set({ liveSessionId: s.id }).where(eq(performers.id, p.id));

  const now = Date.now();
  const mk = async (i: number, item: (typeof items)[number] | null, fan: (typeof fanRows)[number] | null, amount: number, message: string, queueStatus: string | null, seq: number | null, extra: Partial<typeof orders.$inferInsert> = {}) => {
    const [o] = await db
      .insert(orders)
      .values({
        performerId: p.id,
        sessionId: s.id,
        kind: item ? "request" : "tip",
        menuItemId: item?.id ?? null,
        itemTitle: item?.title ?? null,
        tradeNo: `DSSEED${i}${now.toString(36).toUpperCase()}`.slice(0, 20),
        amount,
        nickname: fan?.name ?? "",
        isAnonymous: !fan,
        fanId: fan?.id ?? null,
        message,
        status: "paid",
        paidAt: new Date(now - (10 - i) * 4 * 60_000),
        paymentType: "Credit_CreditCard",
        queueStatus,
        queueSeq: seq,
        feeCents: feeFor(amount),
        ...extra,
      })
      .returning();
    await applyPoints(db, p.id, -feeFor(amount), "fee", { orderId: o.id, note: "示範資料" });
  };
  await mk(1, items[0], fanRows[0], 100, "〈晴天〉是我們的歌", "done", 1, { reply: "謝謝小魚～下次再唱給你聽" });
  await mk(2, null, null, 50, "加油！", null, null);
  await mk(3, items[9], fanRows[1], 200, "女友叫小美，今天生日🎂", "playing", 2);
  await mk(4, items[5], fanRows[2], 150, "唱給阿嬤聽", "waiting", 3);
  await mk(5, items[7], null, 150, "", "waiting", 4);
  for (const a of await db.insert(achievements).values(ACHIEVEMENT_TEMPLATES.map((t) => ({ ...t, performerId: p.id }))).returning()) await backfillAchievement(a, db);
  await db.insert(shows).values({ performerId: p.id, startsAt: new Date(new Date(now + 5 * 86400_000).setUTCHours(11, 30, 0, 0)), location: "駁二大勇倉庫 C5 前", note: "這週有新歌〈雨夜花〉" });

  // 另外兩位示範藝人，讓地區頁有內容可看（僅開發環境）
  const extra = [
    { slug: "demo-ukulele", name: "小雨的烏克麗麗", city: "taipei", district: "信義區・香堤大道", bio: "烏克麗麗自彈自唱，日系與華語抒情。", songs: [["青花瓷", "周杰倫", "華語", 100], ["突然好想你", "五月天", "華語", 100], ["Lemon", "米津玄師", "日文", 150]] },
    { slug: "demo-band", name: "港都三人組", city: "kaohsiung", district: "新興區・中央公園", bio: "木吉他＋木箱鼓＋口琴，台語老歌與搖滾。", songs: [["愛拚才會贏", "葉啟田", "台語", 150], ["海闊天空", "Beyond", "粵語", 150], ["倔強", "五月天", "華語", 100]] },
  ] as const;
  for (const e of extra) {
    const [x] = await db
      .insert(performers)
      .values({ slug: e.slug, displayName: e.name, bio: e.bio, city: e.city, district: e.district, actType: e.slug === "demo-band" ? "band" : "busker", genres: e.slug === "demo-band" ? "台語老歌、搖滾" : "日系、華語抒情", priceFrom: e.slug === "demo-band" ? 15000 : 4000, occasions: ["婚禮", "尾牙春酒", "企業活動"], status: "active", gateway: "mock", payMethods: [{ type: "linepay", label: "LINE Pay", qrText: "DEMO", imageData: null }] })
      .returning();
    await applyPoints(db, x.id, 20000, "signup_bonus", { note: "新手贈點" });
    await db.insert(menuItems).values(e.songs.map(([title, subtitle, category, price], i) => ({ performerId: x.id, title, subtitle, category, price, sort: i })));
    await db.insert(shows).values({ performerId: x.id, startsAt: new Date(new Date(now + (e.city === "taipei" ? 2 : 3) * 86400_000).setUTCHours(e.city === "taipei" ? 11 : 12, 0, 0, 0)), location: e.district.split("・")[1] ?? e.district });
  }
  // 不同類型的示範表演者＋付費推薦＋許願池（僅開發環境）
  const { promotions, wishes } = await import("./schema");
  const more = [
    { slug: "demo-mia", name: "Mia", act: "singer", city: "kaohsiung", district: "鹽埕區・Bar Jade", genres: "華語流行、英文抒情", price: 3500, bio: "在高雄駐唱八年，固定在鹽埕和鼓山的餐酒館演出。婚禮可以配合進場、敬酒、送客三段曲目。", occ: ["餐廳酒吧", "婚禮", "企業活動"] },
    { slug: "demo-mc", name: "主持人小安", act: "mc", city: "kaohsiung", district: "前鎮區", genres: "婚禮、尾牙、記者會", price: 8000, bio: "雙語主持十年，婚禮與尾牙各兩百場以上，流程與音控都能一起確認。", occ: ["婚禮", "尾牙春酒", "企業活動"] },
    { slug: "demo-magic", name: "魔術師阿凱", act: "magic", city: "kaohsiung", district: "左營區", genres: "近距離、親子舞台", price: 5000, bio: "近距離魔術與親子舞台秀，三十分鐘到一小時的節目都有。", occ: ["生日派對", "企業活動", "校園活動"] },
    { slug: "demo-dj", name: "DJ KAI", act: "dj", city: "taipei", district: "大安區", genres: "House、City Pop", price: 6000, bio: "派對與品牌活動 DJ，自備控台，可依場地準備歌單。", occ: ["生日派對", "企業活動", "市集活動"] },
  ];
  for (const e of more) {
    const [x] = await db.insert(performers).values({ slug: e.slug, displayName: e.name, bio: e.bio, city: e.city, district: e.district, actType: e.act, genres: e.genres, priceFrom: e.price, occasions: e.occ, status: "active", gateway: "mock", lineUserId: `Udev-${e.slug}` }).returning();
    await applyPoints(db, x.id, 20000, "signup_bonus", { note: "新手贈點" });
    if (e.act === "singer") {
      // Mia 也在演出中，方便示範跨表演者 PK
      const [ls] = await db.insert(liveSessions).values({ performerId: x.id, location: "鹽埕區・Bar Jade" }).returning();
      await db.update(performers).set({ liveSessionId: ls.id, lat: "22.6241", lng: "120.2810" }).where(eq(performers.id, x.id));
    }
    if (e.act === "singer") await db.insert(menuItems).values([["小幸運", "田馥甄"], ["Perfect", "Ed Sheeran"], ["如果可以", "韋禮安"]].map(([title, subtitle], i) => ({ performerId: x.id, title, subtitle, category: "華語", price: 100, sort: i })));
    if (e.act === "mc" || e.act === "singer") await db.insert(promotions).values({ performerId: x.id, slot: e.act === "mc" ? "home" : "search", city: e.city, actType: e.act, startsAt: new Date(now), endsAt: new Date(now + 7 * 86400_000), costCents: 21000 });
  }
  await db.insert(wishes).values([{ performerId: p.id, title: "倒數 鄧紫棋", votes: 12 }, { performerId: p.id, title: "刻在我心底的名字 盧廣仲", votes: 8 }, { performerId: p.id, title: "告白氣球 周杰倫", votes: 15, status: "practice", note: "預計下週五首唱" }]);

  // 示範店家／主辦帳號與一場活動（僅開發環境）
  // 幾天後的台北時間某點整
  const at = (days: number, hour: number) => { const d = new Date(now + days * 86400_000); d.setUTCHours(hour - 8, 0, 0, 0); return d; };
  const { events, eventPerformers } = await import("./schema");
  const [venue] = await db
    .insert(performers)
    .values({
      slug: "demo-venue", lineUserId: "Udev-venue", displayName: "Bar Jade 展演空間", accountType: "organizer", orgKind: "venue",
      city: "kaohsiung", district: "鹽埕區", address: "高雄市鹽埕區大勇路 1 號", website: "https://example.com",
      bio: "鹽埕的小型展演空間，每週五六有駐唱與樂團演出，可容納 60 人。",
    })
    .returning();
  await applyPoints(db, venue.id, 50000, "signup_bonus", { note: "新手贈點" });
  const mia = (await db.select().from(performers).where(eq(performers.slug, "demo-mia")))[0];
  const [ev] = await db
    .insert(events)
    .values({
      organizerId: venue.id, title: "週五爵士之夜", city: "kaohsiung", place: "Bar Jade", address: "高雄市鹽埕區大勇路 1 號",
      startsAt: at(4, 20), endsAt: at(4, 23), lat: "22.6238", lng: "120.2816",
      description: "每月一次的爵士之夜，兩組演出接力。入場低消一杯。", priceText: "低消 350", guestActs: "Trio Nocturne", notifyFans: true,
    })
    .returning();
  if (mia) await db.insert(eventPerformers).values({ eventId: ev.id, performerId: mia.id, status: "confirmed" });
}
