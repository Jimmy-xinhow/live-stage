import crypto from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { fans, follows, liveSessions, menuItems, orders, performers, type Order, type Performer } from "./db/schema";
import { applyPoints, canAcceptOrders, feeFor, fmtPoints } from "./billing";
import { multicast, pushMessage } from "./line";
import { env } from "./env";
import { nt } from "./format";
import { performerCreds, type PayResult } from "./payments";
import { setFollow } from "./fans";
import { badgesFor, evaluateAchievements, leaderboard, notifyOvertake } from "./rewards";
import { reportError } from "./errors";
import type { ModeSlug } from "./kinds";

export async function getPerformerBySlug(slug: string) {
  const db = await getDb();
  const [p] = await db.select().from(performers).where(and(eq(performers.slug, slug.toLowerCase()), eq(performers.accountType, "performer")));
  return p ?? null;
}

export async function getPerformerById(id: string) {
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.id, id));
  return p ?? null;
}

export function startOfTodayTaipei(now = new Date()) {
  const t = new Date(now.getTime() + 8 * 3600_000);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - 8 * 3600_000);
}

export async function totalsSince(performerId: string, since: Date) {
  const db = await getDb();
  const [r] = await db
    .select({ sum: sql<number>`coalesce(sum(${orders.amount}),0)::int`, count: sql<number>`count(*)::int`, fee: sql<number>`coalesce(sum(${orders.feeCents}),0)::int` })
    .from(orders)
    .where(and(eq(orders.performerId, performerId), eq(orders.status, "paid"), gte(orders.paidAt, since)));
  return { sum: Number(r.sum), count: Number(r.count), feeCents: Number(r.fee) };
}

export const displayName = (o: Pick<Order, "isAnonymous" | "nickname">) => (o.isAnonymous || !o.nickname ? "匿名支持者" : o.nickname);
const orderUrl = (tradeNo: string) => `${env.baseUrl}/o/${tradeNo}`;

/** 手動確認的等待時間：超過就標記逾時（藝人仍可在 2 小時內補確認） */
export const MANUAL_TTL_MIN = 15;
export const MANUAL_LATE_CONFIRM_MIN = 120;

/** 這位藝人目前能提供的付款方式 */
export function payOptions(p: Performer) {
  return {
    manual: p.payMethods.length > 0,
    auto: !!performerCreds(p) || (p.gateway === "mock" && env.allowMock),
  };
}

export async function expireStale(performerId?: string) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - MANUAL_TTL_MIN * 60_000);
  const conds = [eq(orders.status, "awaiting"), lt(orders.createdAt, cutoff)];
  if (performerId) conds.push(eq(orders.performerId, performerId));
  await db.update(orders).set({ status: "expired" }).where(and(...conds));
}

/* ────────────── 排隊 ────────────── */

export async function sessionQueue(sessionId: string) {
  const db = await getDb();
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.sessionId, sessionId), eq(orders.status, "paid"), eq(orders.kind, "request"), inArray(orders.queueStatus, ["playing", "waiting"])))
    .orderBy(asc(orders.queueSeq));
}

/** 這筆前面還有幾首（含正在唱的那首） */
export function positionIn(queue: Order[], o: Order) {
  if (o.queueStatus === "playing") return 0;
  const playing = queue.some((q) => q.queueStatus === "playing") ? 1 : 0;
  return playing + queue.filter((q) => q.queueStatus === "waiting" && (q.queueSeq ?? 0) < (o.queueSeq ?? 0)).length;
}

export type PublicQueueItem = { id: string; seq: number; title: string; name: string; avatar: string | null; message: string; status: "playing" | "waiting"; badge: string | null };

export type WallItem = { id: string; name: string; avatar: string | null; amount: number | null; kind: string; itemTitle: string | null; message: string; reply: string | null; paidAt: string; badge: string | null };

/** 公開頁、大螢幕共用的即時狀態 */
export async function publicState(p: Performer) {
  const db = await getDb();
  const session = p.liveSessionId ? (await db.select().from(liveSessions).where(eq(liveSessions.id, p.liveSessionId)))[0] : null;
  const queue = session ? await sessionQueue(session.id) : [];
  const fanIds = [...new Set(queue.map((q) => q.fanId).filter(Boolean))] as string[];
  const recent = await db
    .select()
    .from(orders)
    .where(and(eq(orders.performerId, p.id), eq(orders.status, "paid"), eq(orders.hidden, false)))
    .orderBy(desc(orders.paidAt))
    .limit(20);
  for (const r of recent) if (r.fanId) fanIds.push(r.fanId);
  const fanRows = fanIds.length ? await db.select().from(fans).where(inArray(fans.id, [...new Set(fanIds)])) : [];
  const avatarOf = (o: Order) => (o.isAnonymous ? null : (fanRows.find((f) => f.id === o.fanId)?.avatarUrl ?? null));
  const badges = await badgesFor(p.id, [...new Set(fanIds)]);
  const badgeOf = (o: Order) => (o.isAnonymous || !o.fanId ? null : (badges.get(o.fanId) ?? null));
  const top = (await leaderboard(p, "session", 3)).map((r) => ({ name: r.name, avatar: r.avatar, badge: r.badge, total: p.showAmounts ? r.total : null }));
  const [{ c: followers }] = await db.select({ c: sql<number>`count(*)::int` }).from(follows).where(eq(follows.performerId, p.id));
  const today = await totalsSince(p.id, startOfTodayTaipei());

  return {
    live: session ? { location: session.location, startedAt: session.startedAt.toISOString(), mode: session.mode } : null,
    queueOpen: p.queueOpen,
    accepting: canAcceptOrders(p.pointsCents) && p.status === "active" && (payOptions(p).manual || payOptions(p).auto),
    payOptions: payOptions(p),
    maxQueue: p.maxQueue,
    avgSongMinutes: p.avgSongMinutes,
    followers: Number(followers),
    today: { count: today.count, sum: p.showAmounts ? today.sum : null },
    queue: queue.map<PublicQueueItem>((q) => ({
      id: q.id,
      seq: q.queueSeq ?? 0,
      title: q.itemTitle ?? "",
      name: displayName(q),
      avatar: avatarOf(q),
      message: q.message,
      status: q.queueStatus as "playing" | "waiting",
      badge: badgeOf(q),
    })),
    wall: recent.map<WallItem>((o) => ({
      id: o.id,
      name: displayName(o),
      avatar: avatarOf(o),
      amount: p.showAmounts ? o.amount : null,
      kind: o.kind,
      itemTitle: o.itemTitle,
      message: o.message,
      reply: o.reply,
      paidAt: (o.paidAt ?? o.createdAt).toISOString(),
      badge: badgeOf(o),
    })),
    top,
  };
}
export type PublicState = Awaited<ReturnType<typeof publicState>>;

/* ────────────── 建單 ────────────── */

export class OrderError extends Error {}

export function newTradeNo(prefix = "DS") {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString("hex").toUpperCase()}`.slice(0, 20);
}

export async function createOrder(
  p: Performer,
  input: { menuItemId?: string | null; amount: number; nickname: string; message: string; isAnonymous: boolean; payMode: "auto" | "manual"; followOnPay?: boolean; game?: { id: string; lane: number; unit: string } | null },
  fanId: string | null,
) {
  if (p.status !== "active") throw new OrderError("此頁面已停用");
  const opts = payOptions(p);
  if (input.payMode === "manual" ? !opts.manual : !opts.auto) throw new OrderError("藝人尚未開放這種付款方式");
  if (!canAcceptOrders(p.pointsCents)) throw new OrderError("藝人暫停接單中");
  if (!Number.isInteger(input.amount) || input.amount < p.minAmount || input.amount > p.maxAmount)
    throw new OrderError(`金額需介於 ${nt(p.minAmount)}～${nt(p.maxAmount)}`);
  const db = await getDb();

  // 花費防護：同一位粉絲在同一場的累計上限。
  // 對戰與派兵是用競爭情緒推升花費的機制，沒有上限很容易出現事後爭議或爭議款，
  // 而一位粉絲衝動花太多、隔天要求退款，那位表演者就不會再用了。
  if (fanId && p.liveSessionId) {
    const cap = p.fanCapCents > 0 ? p.fanCapCents : env.billing.fanSessionCapCents;
    if (cap > 0) {
      const [spent] = await db
        .select({ sum: sql<number>`coalesce(sum(${orders.amount}), 0)::int` })
        .from(orders)
        .where(and(eq(orders.sessionId, p.liveSessionId), eq(orders.fanId, fanId), inArray(orders.status, ["paid", "awaiting", "pending"])));
      const already = Number(spent.sum) * 100;
      if (already + input.amount * 100 > cap) {
        const left = Math.max(0, Math.floor((cap - already) / 100));
        throw new OrderError(
          left > 0
            ? `這場你已經支持 ${nt(Math.floor(already / 100))}，今晚還可以再 ${nt(left)}。想再多支持的話，下次開演見。`
            : `這場你已經支持 ${nt(Math.floor(already / 100))}，到今晚的上限了。謝謝你，下次開演見。`,
        );
      }
    }
  }

  let kind: "request" | "tip" = "tip";
  let itemTitle: string | null = null;
  let sessionId: string | null = p.liveSessionId;
  if (input.menuItemId) {
    const [item] = await db.select().from(menuItems).where(and(eq(menuItems.id, input.menuItemId), eq(menuItems.performerId, p.id)));
    if (!item || !item.enabled) throw new OrderError("這個項目今天暫停點播");
    if (!p.liveSessionId) throw new OrderError("藝人目前沒有在演出，追蹤他就能收到開唱通知");
    if (!p.queueOpen) throw new OrderError("藝人暫停接受點播");
    const waiting = (await sessionQueue(p.liveSessionId)).filter((q) => q.queueStatus === "waiting").length;
    if (waiting >= p.maxQueue) throw new OrderError(`排隊已滿（${p.maxQueue} 首），請稍後再點`);
    if (input.amount < item.price) throw new OrderError(`「${item.title}」最低 ${nt(item.price)}`);
    kind = "request";
    itemTitle = item.title;
  }

  let payCode: string | null = null;
  if (input.payMode === "manual") {
    await expireStale(p.id);
    const used = new Set(
      (await db.select({ c: orders.payCode }).from(orders).where(and(eq(orders.performerId, p.id), inArray(orders.status, ["awaiting", "expired"]), gte(orders.createdAt, new Date(Date.now() - MANUAL_LATE_CONFIRM_MIN * 60_000))))).map((r) => r.c),
    );
    for (let i = 0; i < 50 && (!payCode || used.has(payCode)); i++) payCode = String(crypto.randomInt(1000, 10000));
  }

  let nickname = input.nickname.trim().slice(0, 30);
  if (!nickname && fanId) nickname = (await db.select({ n: fans.name }).from(fans).where(eq(fans.id, fanId)))[0]?.n ?? "";

  const [o] = await db
    .insert(orders)
    .values({
      performerId: p.id,
      sessionId,
      kind,
      menuItemId: input.menuItemId ?? null,
      itemTitle,
      tradeNo: newTradeNo(),
      amount: input.amount,
      nickname,
      message: input.message.trim().slice(0, 120),
      isAnonymous: input.isAnonymous,
      fanId,
      payMode: input.payMode,
      payCode,
      followOnPay: input.followOnPay ?? true,
      gameId: input.game?.id ?? null,
      gameLane: input.game?.lane ?? null,
      gameUnit: input.game?.unit ?? null,
      status: input.payMode === "manual" ? "awaiting" : "pending",
    })
    .returning();
  return o;
}

/* ────────────── 付款結果 ────────────── */

/**
 * 付款成功（冪等）：pending→paid 只會發生一次；排隊序號、扣 3% 點數、通知都在這一次完成。
 * 鎖藝人那一列，避免同時兩筆付款拿到相同排隊序號。
 */
export async function markOrderPaid(tradeNo: string, r: Pick<PayResult, "paymentType" | "gatewayTradeNo" | "raw">, amountOverride?: number) {
  const db = await getDb();
  const result = await db.transaction(async (tx) => {
    const [o0] = await tx.select().from(orders).where(eq(orders.tradeNo, tradeNo));
    const payable = o0?.payMode === "manual" ? ["awaiting", "expired"] : ["pending"];
    if (!o0 || !payable.includes(o0.status)) return null;
    if (amountOverride && amountOverride !== o0.amount) o0.amount = amountOverride;
    const [p] = await tx.select().from(performers).where(eq(performers.id, o0.performerId)).for("update");
    let queueSeq: number | null = null;
    if (o0.kind === "request" && o0.sessionId) {
      const [{ m }] = await tx
        .select({ m: sql<number>`coalesce(max(${orders.queueSeq}),0)::int` })
        .from(orders)
        .where(eq(orders.sessionId, o0.sessionId));
      queueSeq = Number(m) + 1;
      if (o0.menuItemId) await tx.update(menuItems).set({ requestCount: sql`${menuItems.requestCount} + 1` }).where(eq(menuItems.id, o0.menuItemId));
    }
    const fee = feeFor(o0.amount);
    const [o] = await tx
      .update(orders)
      .set({
        status: "paid",
        amount: o0.amount,
        paidAt: new Date(),
        paymentType: r.paymentType || null,
        gatewayTradeNo: r.gatewayTradeNo || null,
        rawNotify: r.raw ?? null,
        feeCents: fee,
        queueSeq,
        queueStatus: queueSeq ? "waiting" : null,
      })
      .where(and(eq(orders.id, o0.id), inArray(orders.status, payable)))
      .returning();
    if (!o) return null;
    const balance = await applyPoints(tx, p.id, -fee, "fee", { orderId: o.id, note: `${o.itemTitle ?? "打賞"} ${nt(o.amount)} × ${env.billing.feeRate * 100}%` });
    return { order: o, performer: { ...p, pointsCents: balance } };
  });
  if (result) await afterPaid(result.performer, result.order).catch((e) => reportError("afterPaid", e));
  return result?.order ?? null;
}

export async function markOrderFailed(tradeNo: string, raw?: unknown) {
  const db = await getDb();
  await db.update(orders).set({ status: "failed", rawNotify: raw ?? null }).where(and(eq(orders.tradeNo, tradeNo), eq(orders.status, "pending")));
}

async function fanLineId(fanId: string | null) {
  if (!fanId) return null;
  const db = await getDb();
  return (await db.select({ l: fans.lineUserId }).from(fans).where(eq(fans.id, fanId)))[0]?.l ?? null;
}

async function afterPaid(p: Performer, o: Order) {
  // 付款確認＝真的支持過，這時自動追蹤（觀眾在表單上可取消勾選）
  if (o.fanId && o.followOnPay) await setFollow(p.id, o.fanId, true);
  // 成就解鎖與本場榜超越通知
  if (o.fanId) {
    await evaluateAchievements(p, o.fanId).catch((e) => reportError("achievements", e));
    await notifyOvertake(p, o).catch((e) => reportError("overtake", e));
  }
  const who = displayName(o);
  if (o.gameId) {
    const { applyBoost, currentGame } = await import("./games");
    // 跨表演者 PK：加成一律算在付款頁面所屬的那位表演者
    const g = await currentGame(o.performerId).catch(() => null);
    const lane = g?.opponentId ? (g.performerId === o.performerId ? 0 : 1) : o.gameLane ?? 0;
    await applyBoost(o.gameId, o.fanId, who, lane, o.gameUnit ?? "", o.amount).catch((e) => reportError("boost", e));
  }
  const queue = o.sessionId && o.kind === "request" ? await sessionQueue(o.sessionId) : [];
  const ahead = o.kind === "request" ? positionIn(queue, o) : 0;

  if (p.notifyLine && p.lineUserId) {
    const lines =
      o.kind === "request"
        ? [`🎵 新點歌 #${o.queueSeq}〈${o.itemTitle}〉`, `${who}・${nt(o.amount)}`, o.message ? `💬「${o.message}」` : "", `目前排隊 ${queue.filter((q) => q.queueStatus === "waiting").length} 首`, `演出控制台：${env.baseUrl}/dashboard/stage`]
        : [`💰 ${who} 打賞 ${nt(o.amount)}`, o.message ? `💬「${o.message}」` : ""];
    await pushMessage(p.lineUserId, [{ type: "text", text: lines.filter(Boolean).join("\n") }]);
  }
  const fanLine = await fanLineId(o.fanId);
  if (fanLine) {
    const text =
      o.kind === "request"
        ? `✅ 點歌成功〈${o.itemTitle}〉\n${ahead <= 1 ? "下一首就是你！" : `你前面還有 ${ahead} 首，約 ${ahead * p.avgSongMinutes} 分鐘`}\n即時排隊：${orderUrl(o.tradeNo)}`
        : `✅ 已打賞 ${p.displayName} ${nt(o.amount)}\n${p.displayName}：${p.thankYouText}`;
    await pushMessage(fanLine, [{ type: "text", text }]);
  }
  await checkLowBalance(p);
}

async function checkLowBalance(p: Performer) {
  if (!p.lineUserId || p.pointsCents >= env.billing.lowBalanceCents) return;
  const last = p.lowBalanceNotifiedAt?.getTime() ?? 0;
  if (Date.now() - last < 12 * 3600_000) return;
  const db = await getDb();
  await db.update(performers).set({ lowBalanceNotifiedAt: new Date() }).where(eq(performers.id, p.id));
  const paused = !canAcceptOrders(p.pointsCents);
  await pushMessage(p.lineUserId, [
    {
      type: "text",
      text: paused
        ? `⚠️ 點數已用完（${fmtPoints(p.pointsCents)} 點），點歌與打賞已暫停。\n補充點數：${env.baseUrl}/dashboard/points`
        : `🔋 點數剩 ${fmtPoints(p.pointsCents)} 點，用完會暫停接單。\n補充點數：${env.baseUrl}/dashboard/points`,
    },
  ]);
}

/* ────────────── 手動確認（免申請模式） ────────────── */

/** 藝人還沒處理的轉帳：等待中＋2 小時內逾時的 */
export async function pendingManual(p: Performer) {
  await expireStale(p.id);
  const db = await getDb();
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.performerId, p.id),
        eq(orders.payMode, "manual"),
        inArray(orders.status, ["awaiting", "expired"]),
        gte(orders.createdAt, new Date(Date.now() - MANUAL_LATE_CONFIRM_MIN * 60_000)),
      ),
    )
    .orderBy(desc(orders.claimedAt), desc(orders.createdAt));
}

async function manualOrder(p: Performer, where: { id?: string; code?: string }) {
  const list = await pendingManual(p);
  return list.find((o) => (where.id ? o.id === where.id : o.payCode === where.code)) ?? null;
}

/** 藝人確認收到轉帳 → 進排隊、扣點、通知（可修正實收金額） */
export async function confirmManual(p: Performer, where: { id?: string; code?: string }, amount?: number) {
  const o = await manualOrder(p, where);
  if (!o) throw new OrderError(where.code ? `找不到待確認的點歌碼 ${where.code}` : "這筆已處理或已過期");
  const paid = await markOrderPaid(o.tradeNo, { paymentType: "manual", gatewayTradeNo: "", raw: null }, amount && amount > 0 ? amount : undefined);
  if (!paid) throw new OrderError("這筆已處理");
  return paid;
}

/** 藝人沒收到款項 → 取消並通知觀眾 */
export async function rejectManual(p: Performer, where: { id?: string; code?: string }) {
  const o = await manualOrder(p, where);
  if (!o) throw new OrderError("這筆已處理或已過期");
  const db = await getDb();
  await db.update(orders).set({ status: "failed" }).where(and(eq(orders.id, o.id), inArray(orders.status, ["awaiting", "expired"])));
  const l = await fanLineId(o.fanId);
  if (l) await pushMessage(l, [{ type: "text", text: `${p.displayName} 沒有查到點歌碼 ${o.payCode} 的轉帳，這筆已取消。若確定已付款，請直接跟藝人說。` }]);
  return o;
}

/** 觀眾按「我付好了」：提醒藝人，附快速確認按鈕 */
export async function claimOrder(tradeNo: string) {
  const db = await getDb();
  const [o] = await db
    .update(orders)
    .set({ claimedAt: new Date() })
    .where(and(eq(orders.tradeNo, tradeNo), eq(orders.payMode, "manual"), inArray(orders.status, ["awaiting", "expired"])))
    .returning();
  if (!o) return null;
  const p = await getPerformerById(o.performerId);
  if (p?.lineUserId && p.notifyLine) {
    await pushMessage(p.lineUserId, [
      {
        type: "text",
        text: `💸 ${displayName(o)} 說已轉帳 ${nt(o.amount)}\n點歌碼 ${o.payCode}${o.itemTitle ? `〈${o.itemTitle}〉` : "（打賞）"}\n請對一下 LINE Pay 入帳備註`,
        quickReply: {
          items: [
            { type: "action", action: { type: "postback", label: `✅ 已收到 ${o.payCode}`, data: `confirm:${o.id}`, displayText: `已收到 ${o.payCode}` } },
            { type: "action", action: { type: "postback", label: "❌ 沒收到", data: `reject:${o.id}`, displayText: `沒收到 ${o.payCode}` } },
          ],
        },
      },
    ]);
  }
  return o;
}

/* ────────────── 演出控制 ────────────── */

export async function goLive(p: Performer, location: string, notifyFans: boolean, mode: ModeSlug = "onsite") {
  const db = await getDb();
  if (p.liveSessionId) return { notified: 0 };
  const [s] = await db.insert(liveSessions).values({ performerId: p.id, location: location.slice(0, 60), mode }).returning();
  await db.update(performers).set({ liveSessionId: s.id, queueOpen: true }).where(eq(performers.id, p.id));
  if (!notifyFans) return { notified: 0 };

  const rows = await db
    .select({ line: fans.lineUserId })
    .from(follows)
    .innerJoin(fans, eq(fans.id, follows.fanId))
    .where(and(eq(follows.performerId, p.id), eq(follows.notifyLive, true), isNotNull(fans.lineUserId)));
  const ids = rows.map((r) => r.line);
  if (!ids.length) return { notified: 0 };
  await multicast(ids, [
    {
      type: "text",
      text:
        mode === "indoor"
          ? `🔴 ${p.displayName} 開播了！\n現在就能點歌：${env.baseUrl}/p/${p.slug}`
          : `🎤 ${p.displayName} 開唱了！${location ? `\n📍 ${location}` : ""}\n現在就能點歌：${env.baseUrl}/p/${p.slug}`,
    },
  ]);
  const cost = ids.length * env.billing.liveNotifyCents;
  if (cost) await applyPoints(db, p.id, -cost, "live_notify", { note: `開唱通知 ${ids.length} 位粉絲` });
  await db.update(liveSessions).set({ notifiedCount: ids.length }).where(eq(liveSessions.id, s.id));
  return { notified: ids.length };
}

export async function endLive(p: Performer) {
  const db = await getDb();
  if (!p.liveSessionId) return;
  await db.update(liveSessions).set({ endedAt: new Date() }).where(eq(liveSessions.id, p.liveSessionId));
  await db.update(performers).set({ liveSessionId: null }).where(eq(performers.id, p.id));
}

/** 藝人操作排隊：開始唱（自動完成上一首）／完成／跳過 */
export async function queueAction(p: Performer, orderId: string, action: "start" | "done" | "skip") {
  const db = await getDb();
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.performerId, p.id), eq(orders.status, "paid"), eq(orders.kind, "request")));
  if (!o || !o.sessionId) throw new OrderError("找不到這筆點歌");
  const now = new Date();

  if (action === "start") {
    await db
      .update(orders)
      .set({ queueStatus: "done", finishedAt: now })
      .where(and(eq(orders.sessionId, o.sessionId), eq(orders.queueStatus, "playing")));
    await db.update(orders).set({ queueStatus: "playing", startedAt: now }).where(eq(orders.id, o.id));
    const l = await fanLineId(o.fanId);
    if (l) await pushMessage(l, [{ type: "text", text: `🎤 ${p.displayName} 正在為你演唱〈${o.itemTitle}〉！` }]);
  } else {
    await db
      .update(orders)
      .set({ queueStatus: action === "done" ? "done" : "skipped", finishedAt: now })
      .where(eq(orders.id, o.id));
    if (action === "skip") {
      const l = await fanLineId(o.fanId);
      if (l) await pushMessage(l, [{ type: "text", text: `${p.displayName} 這次無法演唱〈${o.itemTitle}〉，退款請直接與藝人聯繫，抱歉！` }]);
    }
  }
  // 通知「下一首就是你」
  const queue = await sessionQueue(o.sessionId);
  const next = queue.find((q) => q.queueStatus === "waiting" && positionIn(queue, q) <= 1);
  if (next && next.id !== o.id) {
    const l = await fanLineId(next.fanId);
    if (l && action === "start") await pushMessage(l, [{ type: "text", text: `⏭ 下一首就是你點的〈${next.itemTitle}〉，準備好囉！` }]);
  }
}

/** 觀眾查自己的點歌 */
export async function orderStatus(tradeNo: string) {
  await expireStale();
  const db = await getDb();
  const [o] = await db.select().from(orders).where(eq(orders.tradeNo, tradeNo));
  if (!o) return null;
  const p = (await getPerformerById(o.performerId))!;
  let ahead: number | null = null;
  if (o.kind === "request" && o.status === "paid" && o.sessionId && (o.queueStatus === "waiting" || o.queueStatus === "playing")) {
    ahead = positionIn(await sessionQueue(o.sessionId), o);
  }
  return {
    status: o.status,
    kind: o.kind,
    itemTitle: o.itemTitle,
    amount: o.amount,
    queueStatus: o.queueStatus,
    ahead,
    etaMinutes: ahead != null ? ahead * p.avgSongMinutes : null,
    reply: o.reply,
    payMode: o.payMode,
    payCode: o.payCode,
    claimed: !!o.claimedAt,
    createdAt: o.createdAt.toISOString(),
    following: null as boolean | null,
    performerId: p.id,
    performer: { slug: p.slug, name: p.displayName, color: p.themeColor, avatar: p.avatarUrl, thankYou: p.thankYouText },
  };
}

/**
 * 退款。平台不經手款項，所以這裡做的是：把訂單標成已退款、把排隊項目移出隊伍、
 * 並退還當初扣掉的服務費點數。實際的錢由表演者自行退還給觀眾。
 *
 * 之後接上正式金流時，auto 付款的訂單要在這裡多呼叫一次金流商的退刷 API；
 * 現在回傳的 needsGatewayRefund 就是給呼叫端提示用的。
 */
export async function refundOrder(opts: {
  orderId: string;
  by: "performer" | "admin";
  note?: string;
  /** 限制只能退這位表演者的訂單（表演者自己操作時帶） */
  performerId?: string;
}) {
  const db = await getDb();
  return await db.transaction(async (tx) => {
    const conds = [eq(orders.id, opts.orderId), eq(orders.status, "paid")];
    if (opts.performerId) conds.push(eq(orders.performerId, opts.performerId));
    const [o0] = await tx.select().from(orders).where(and(...conds));
    if (!o0) return null;
    const [o] = await tx
      .update(orders)
      .set({
        status: "refunded",
        refundedAt: new Date(),
        refundBy: opts.by,
        refundNote: (opts.note ?? "").slice(0, 120),
        queueStatus: o0.queueStatus === "waiting" || o0.queueStatus === "playing" ? "skipped" : o0.queueStatus,
      })
      .where(eq(orders.id, o0.id))
      .returning();
    if (o0.feeCents > 0) {
      await applyPoints(tx, o0.performerId, o0.feeCents, "fee_refund", {
        orderId: o0.id,
        note: `退款退回服務費・${o0.itemTitle ?? "打賞"} ${nt(o0.amount)}`,
      });
    }
    return { order: o, needsGatewayRefund: o0.payMode === "auto" };
  });
}

/** 這場演出的模式（決定能不能開對戰與派兵） */
export async function sessionMode(sessionId: string | null) {
  if (!sessionId) return null;
  const db = await getDb();
  const [s] = await db.select({ mode: liveSessions.mode }).from(liveSessions).where(eq(liveSessions.id, sessionId));
  return s?.mode ?? null;
}
