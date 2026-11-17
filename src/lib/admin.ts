import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  chatMessages, events, eventPerformers, fans, follows, inquiries, inquiryTargets, liveSessions, orders,
  performers, pointLedger, pointPurchases, promotions,
} from "./db/schema";
import { areaBySlug } from "./areas";
import { actName } from "./acts";
import { env } from "./env";

const n = (v: unknown) => Number(v ?? 0);
const since = (days: number) => new Date(Date.now() - days * 86400_000);
/** 在原生 SQL 片段裡比時間：postgres-js 不吃 Date 物件，要自己轉字串再轉型別 */
const at = (d: Date) => sql`${d.toISOString()}::timestamptz`;

/** 總覽數字：成交、服務費、購點、曝光、互動 */
export async function overview() {
  const db = await getDb();
  const d1 = since(1), d7 = since(7), d30 = since(30);
  const [[pay], [buy], [promo], [inq], [acct], [live], [ev], [fanN], [chat]] = await Promise.all([
    db
      .select({
        gmv1: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.paidAt} > ${at(d1)}),0)::int`,
        gmv7: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.paidAt} > ${at(d7)}),0)::int`,
        gmv30: sql<number>`coalesce(sum(${orders.amount}) filter (where ${orders.paidAt} > ${at(d30)}),0)::int`,
        fee30: sql<number>`coalesce(sum(${orders.feeCents}) filter (where ${orders.paidAt} > ${at(d30)}),0)::int`,
        cnt30: sql<number>`count(*) filter (where ${orders.paidAt} > ${at(d30)})::int`,
        awaiting: sql<number>`count(*) filter (where ${orders.status} = 'awaiting')::int`,
      })
      .from(orders)
      .where(sql`${orders.status} in ('paid','awaiting')`),
    db
      .select({ nt30: sql<number>`coalesce(sum(${pointPurchases.priceNt}),0)::int`, cnt30: sql<number>`count(*)::int` })
      .from(pointPurchases)
      .where(and(eq(pointPurchases.status, "paid"), gte(pointPurchases.paidAt, d30))),
    db
      .select({ pts30: sql<number>`coalesce(sum(${promotions.costCents}),0)::int`, cnt30: sql<number>`count(*)::int`, imp: sql<number>`coalesce(sum(${promotions.impressions}),0)::int`, clk: sql<number>`coalesce(sum(${promotions.clicks}),0)::int` })
      .from(promotions)
      .where(gte(promotions.createdAt, d30)),
    db.select({ cnt30: sql<number>`count(*)::int` }).from(inquiries).where(gte(inquiries.createdAt, d30)),
    db
      .select({
        performers: sql<number>`count(*) filter (where ${performers.accountType} = 'performer')::int`,
        organizers: sql<number>`count(*) filter (where ${performers.accountType} = 'organizer')::int`,
        suspended: sql<number>`count(*) filter (where ${performers.status} = 'suspended')::int`,
        new30: sql<number>`count(*) filter (where ${performers.createdAt} > ${at(d30)} and ${performers.accountType} = 'performer')::int`,
      })
      .from(performers),
    db.select({ now: sql<number>`count(*)::int` }).from(performers).where(isNotNull(performers.liveSessionId)),
    db.select({ upcoming: sql<number>`count(*) filter (where ${events.startsAt} > now() and ${events.status} = 'published')::int`, total: sql<number>`count(*)::int` }).from(events),
    db.select({ total: sql<number>`count(*)::int`, new30: sql<number>`count(*) filter (where ${fans.createdAt} > ${at(d30)})::int` }).from(fans),
    db.select({ n: sql<number>`count(*)::int` }).from(chatMessages).where(gte(chatMessages.createdAt, d30)),
  ]);
  const [reply] = await db
    .select({ total: sql<number>`count(*)::int`, replied: sql<number>`count(*) filter (where ${inquiryTargets.status} <> 'new')::int` })
    .from(inquiryTargets)
    .innerJoin(inquiries, eq(inquiries.id, inquiryTargets.inquiryId))
    .where(gte(inquiries.createdAt, d30));
  return {
    gmv: { d1: n(pay.gmv1), d7: n(pay.gmv7), d30: n(pay.gmv30) },
    fee30: n(pay.fee30),
    orders30: n(pay.cnt30),
    awaiting: n(pay.awaiting),
    points: { nt30: n(buy.nt30), cnt30: n(buy.cnt30) },
    promo: { pts30: n(promo.pts30), cnt30: n(promo.cnt30), imp: n(promo.imp), clk: n(promo.clk) },
    inquiries30: n(inq.cnt30),
    replyRate: n(reply.total) ? Math.round((n(reply.replied) / n(reply.total)) * 100) : null,
    accounts: { performers: n(acct.performers), organizers: n(acct.organizers), suspended: n(acct.suspended), new30: n(acct.new30) },
    liveNow: n(live.now),
    events: { upcoming: n(ev.upcoming), total: n(ev.total) },
    fans: { total: n(fanN.total), new30: n(fanN.new30) },
    chat30: n(chat.n),
  };
}

/** 每天的成交與筆數，給總覽的小圖表用 */
export async function dailyRevenue(days = 14) {
  const db = await getDb();
  const rows = await db
    .select({ day: sql<string>`to_char(${orders.paidAt} at time zone 'Asia/Taipei', 'MM-DD')`, sum: sql<number>`coalesce(sum(${orders.amount}),0)::int`, cnt: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.paidAt, since(days))))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  // 補滿沒有交易的日子，圖表才會是完整的 14 格
  const out: { day: string; sum: number; cnt: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() + 8 * 3600_000 - i * 86400_000);
    const key = `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const hit = rows.find((r) => r.day === key);
    out.push({ day: key, sum: n(hit?.sum), cnt: n(hit?.cnt) });
  }
  return out;
}

export type AccountRow = {
  id: string; slug: string; name: string; kind: string; status: string; city: string; act: string; avatar: string | null;
  points: number; shows: number; gmv: number; fans: number; events: number; createdAt: string; live: boolean;
};

/** 帳號清單：表演者或店家主辦 */
export async function accounts(kind: "performer" | "organizer", q = ""): Promise<AccountRow[]> {
  const db = await getDb();
  const conds = [eq(performers.accountType, kind)];
  if (q) conds.push(sql`(${performers.displayName} ilike ${"%" + q + "%"} or ${performers.slug} ilike ${"%" + q + "%"})`);
  const list = await db.select().from(performers).where(and(...conds)).orderBy(desc(performers.createdAt)).limit(200);
  if (!list.length) return [];
  const ids = list.map((p) => p.id);
  const [gmv, shows, fanRows, evRows] = await Promise.all([
    db.select({ id: orders.performerId, sum: sql<number>`coalesce(sum(${orders.amount}),0)::int` }).from(orders).where(and(eq(orders.status, "paid"), inArray(orders.performerId, ids))).groupBy(orders.performerId),
    db.select({ id: liveSessions.performerId, n: sql<number>`count(*)::int` }).from(liveSessions).where(inArray(liveSessions.performerId, ids)).groupBy(liveSessions.performerId),
    db.select({ id: follows.performerId, n: sql<number>`count(*)::int` }).from(follows).where(inArray(follows.performerId, ids)).groupBy(follows.performerId),
    db.select({ id: events.organizerId, n: sql<number>`count(*)::int` }).from(events).where(inArray(events.organizerId, ids)).groupBy(events.organizerId),
  ]);
  return list.map((p) => ({
    id: p.id, slug: p.slug, name: p.displayName, kind: p.accountType, status: p.status, avatar: p.avatarUrl ?? p.coverUrl,
    city: areaBySlug(p.city)?.short ?? "—", act: p.accountType === "performer" ? actName(p.actType) : p.orgKind,
    points: p.pointsCents / 100,
    shows: n(shows.find((x) => x.id === p.id)?.n),
    gmv: n(gmv.find((x) => x.id === p.id)?.sum),
    fans: n(fanRows.find((x) => x.id === p.id)?.n),
    events: n(evRows.find((x) => x.id === p.id)?.n),
    createdAt: p.createdAt.toISOString(),
    live: !!p.liveSessionId,
  }));
}

/** 交易：最近的點歌與打賞 */
export async function recentOrders(status = "", limit = 100) {
  const db = await getDb();
  const conds = status ? [eq(orders.status, status)] : [];
  const rows = await db
    .select({ o: orders, name: performers.displayName, slug: performers.slug })
    .from(orders)
    .innerJoin(performers, eq(performers.id, orders.performerId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.o.id, tradeNo: r.o.tradeNo, performer: r.name, slug: r.slug, amount: r.o.amount, fee: r.o.feeCents / 100,
    kind: r.o.kind, item: r.o.itemTitle, status: r.o.status, payMode: r.o.payMode, queue: r.o.queueStatus,
    at: (r.o.paidAt ?? r.o.createdAt).toISOString(), game: !!r.o.gameId,
  }));
}

/** 點數：購買紀錄與全站異動 */
export async function pointsData() {
  const db = await getDb();
  const [buys, ledger] = await Promise.all([
    db
      .select({ p: pointPurchases, name: performers.displayName })
      .from(pointPurchases)
      .innerJoin(performers, eq(performers.id, pointPurchases.performerId))
      .orderBy(desc(pointPurchases.createdAt))
      .limit(60),
    db
      .select({ l: pointLedger, name: performers.displayName })
      .from(pointLedger)
      .innerJoin(performers, eq(performers.id, pointLedger.performerId))
      .orderBy(desc(pointLedger.createdAt))
      .limit(80),
  ]);
  return {
    buys: buys.map((b) => ({ id: b.p.id, name: b.name, tradeNo: b.p.tradeNo, nt: b.p.priceNt, points: b.p.pointsCents / 100, status: b.p.status, at: (b.p.paidAt ?? b.p.createdAt).toISOString() })),
    ledger: ledger.map((x) => ({ id: x.l.id, name: x.name, delta: x.l.deltaCents / 100, balance: x.l.balanceAfterCents / 100, reason: x.l.reason, note: x.l.note, at: x.l.createdAt.toISOString() })),
  };
}

/** 曝光版位（含活動版位） */
export async function promotionsData() {
  const db = await getDb();
  const rows = await db
    .select({ p: promotions, name: performers.displayName, title: events.title })
    .from(promotions)
    .innerJoin(performers, eq(performers.id, promotions.performerId))
    .leftJoin(events, eq(events.id, promotions.eventId))
    .orderBy(desc(promotions.createdAt))
    .limit(100);
  return rows.map((r) => ({
    id: r.p.id, buyer: r.name, slot: r.p.slot, target: r.title ?? r.name, city: areaBySlug(r.p.city)?.short ?? "",
    act: r.p.actType === "event" ? "活動" : actName(r.p.actType), cost: r.p.costCents / 100,
    impressions: r.p.impressions, clicks: r.p.clicks, startsAt: r.p.startsAt.toISOString(), endsAt: r.p.endsAt.toISOString(),
  }));
}

/** 邀約與評價 */
export async function matchData() {
  const db = await getDb();
  const [inqs, revs] = await Promise.all([
    db
      .select({ i: inquiries, targets: sql<number>`count(${inquiryTargets.performerId})::int`, replied: sql<number>`count(*) filter (where ${inquiryTargets.status} <> 'new')::int`, quoted: sql<number>`count(*) filter (where ${inquiryTargets.status} = 'quoted')::int` })
      .from(inquiries)
      .leftJoin(inquiryTargets, eq(inquiryTargets.inquiryId, inquiries.id))
      .groupBy(inquiries.id)
      .orderBy(desc(inquiries.createdAt))
      .limit(60),
    db
      .select({ t: inquiryTargets, name: performers.displayName, slug: performers.slug, by: inquiries.contactName, occasion: inquiries.occasion })
      .from(inquiryTargets)
      .innerJoin(performers, eq(performers.id, inquiryTargets.performerId))
      .innerJoin(inquiries, eq(inquiries.id, inquiryTargets.inquiryId))
      .where(isNotNull(inquiryTargets.reviewedAt))
      .orderBy(desc(inquiryTargets.reviewedAt))
      .limit(60),
  ]);
  return {
    inquiries: inqs.map((x) => ({
      id: x.i.id, occasion: x.i.occasion, city: areaBySlug(x.i.city)?.short ?? "", date: x.i.eventDate, budget: x.i.budget,
      by: x.i.contactName, targets: n(x.targets), replied: n(x.replied), quoted: n(x.quoted), at: x.i.createdAt.toISOString(),
    })),
    reviews: revs.map((r) => ({
      inquiryId: r.t.inquiryId, performerId: r.t.performerId, performer: r.name, slug: r.slug, by: r.by, occasion: r.occasion,
      rating: r.t.rating ?? 0, review: r.t.review ?? "", hidden: r.t.reviewHidden, at: r.t.reviewedAt!.toISOString(),
    })),
  };
}

/** 活動清單（含標記的表演者狀態） */
export async function eventsData() {
  const db = await getDb();
  const rows = await db
    .select({ e: events, org: performers.displayName })
    .from(events)
    .innerJoin(performers, eq(performers.id, events.organizerId))
    .orderBy(desc(events.startsAt))
    .limit(80);
  const tags = rows.length
    ? await db
        .select({ eid: eventPerformers.eventId, name: performers.displayName, status: eventPerformers.status })
        .from(eventPerformers)
        .innerJoin(performers, eq(performers.id, eventPerformers.performerId))
    : [];
  return rows.map((r) => ({
    id: r.e.id, title: r.e.title, organizer: r.org, city: areaBySlug(r.e.city)?.short ?? "", place: r.e.place,
    startsAt: r.e.startsAt.toISOString(), status: r.e.status,
    acts: tags.filter((t) => t.eid === r.e.id).map((t) => `${t.name}（${t.status === "confirmed" ? "已確認" : t.status === "pending" ? "待確認" : "已婉拒"}）`),
  }));
}

/** 系統設定健檢：哪些外部服務設好了 */
export function systemChecks() {
  const db = process.env.DATABASE_URL ? "外部 Postgres" : "內嵌 PGlite（開發用）";
  return [
    { name: "資料庫", ok: true, value: db },
    { name: "網站網址", ok: !!process.env.APP_BASE_URL, value: env.baseUrl },
    { name: "LINE Login", ok: !!env.line.loginChannelId, value: env.line.loginChannelId ? "已設定" : "未設定（無法用 LINE 登入）" },
    { name: "LINE Messaging", ok: !!env.line.messagingAccessToken, value: env.line.messagingAccessToken ? "已設定" : "未設定（通知只寫在伺服器記錄）" },
    { name: "平台購點金流", ok: env.platformGateway.gateway !== "mock" && !!env.platformGateway.merchantId, value: env.platformGateway.gateway === "mock" ? "模擬模式" : env.platformGateway.gateway },
    { name: "模擬付款", ok: !env.allowMock, value: env.allowMock ? "開啟（展示用，正式環境請關閉）" : "已關閉" },
    { name: "開發登入", ok: !env.allowDevLogin, value: env.allowDevLogin ? "開啟（展示用，正式環境請關閉）" : "已關閉" },
    { name: "直播聊天室", ok: !!env.chat.youtubeApiKey, value: env.chat.youtubeApiKey ? "已設定 YouTube 金鑰" : "未設定（功能關閉）" },
    { name: "服務費率", ok: true, value: `${(env.billing.feeRate * 100).toFixed(1)}%` },
    { name: "管理密碼登入", ok: !!env.adminPassword, value: env.adminPassword ? "已設定" : "未設定（只能用 LINE 管理員帳號）" },
  ];
}

/** 檢舉清單，附上被檢舉對象的可讀資訊 */
export async function reportsData(status = "new") {
  const db = await getDb();
  const { reports, orders: ord, events: ev, performers: pf, fans: fn } = await import("./db/schema");
  const rows = await db
    .select({ r: reports, fan: fn.name })
    .from(reports)
    .leftJoin(fn, eq(fn.id, reports.fanId))
    .where(status ? eq(reports.status, status) : undefined)
    .orderBy(desc(reports.createdAt))
    .limit(200);
  if (!rows.length) return [];
  // 一次把對象的名稱補齊
  const byType = (t: string) => rows.filter((x) => x.r.targetType === t).map((x) => x.r.targetId);
  const [ordRows, evRows, pfRows] = await Promise.all([
    byType("order").length ? db.select({ id: ord.id, title: ord.itemTitle, msg: ord.message, who: pf.displayName }).from(ord).innerJoin(pf, eq(pf.id, ord.performerId)).where(inArray(ord.id, byType("order"))) : [],
    byType("event").length ? db.select({ id: ev.id, title: ev.title }).from(ev).where(inArray(ev.id, byType("event"))) : [],
    byType("performer").length ? db.select({ id: pf.id, title: pf.displayName }).from(pf).where(inArray(pf.id, byType("performer"))) : [],
  ]);
  return rows.map(({ r, fan }) => {
    let label = "（對象已刪除）";
    let href: string | null = null;
    if (r.targetType === "order") {
      const o = ordRows.find((x) => x.id === r.targetId);
      if (o) { label = `${o.who}・${o.title ? `〈${o.title}〉` : "打賞"}${o.msg ? `「${o.msg}」` : ""}`; href = null; }
    } else if (r.targetType === "event") {
      const e = evRows.find((x) => x.id === r.targetId);
      if (e) { label = e.title; href = `/e/${e.id}`; }
    } else if (r.targetType === "performer") {
      const p = pfRows.find((x) => x.id === r.targetId);
      if (p) { label = p.title; href = null; }
    } else if (r.targetType === "chat") {
      label = "聊天室訊息";
    }
    return {
      id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, note: r.note,
      status: r.status, at: r.createdAt.toISOString(), by: fan ?? "未登入", label, href,
    };
  });
}
