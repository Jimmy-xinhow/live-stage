import crypto from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, type DB } from "./db";
import { achievements, fanAchievements, fans, liveSessions, orders, performers, type Achievement, type Order, type Performer } from "./db/schema";
import { pushMessage } from "./line";
import { env } from "./env";
import { nt } from "./format";

export type Period = "session" | "month" | "all";

export function startOfMonthTaipei(now = new Date()) {
  const t = new Date(now.getTime() + 8 * 3600_000);
  t.setUTCDate(1);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - 8 * 3600_000);
}

/** 本場：正在演出的那一場；沒在演出就用最近一場 */
async function sessionFor(p: Performer) {
  if (p.liveSessionId) return p.liveSessionId;
  const db = await getDb();
  const [s] = await db.select({ id: liveSessions.id }).from(liveSessions).where(eq(liveSessions.performerId, p.id)).orderBy(desc(liveSessions.startedAt)).limit(1);
  return s?.id ?? null;
}

export type RankRow = { fanId: string; name: string; avatar: string | null; total: number; count: number; badge: string | null };

/** 支持排行榜：只計入用 LINE 身分付款的支持（鼓勵觀眾登入），全部匿名的人顯示為匿名 */
export async function leaderboard(p: Performer, period: Period, limit = 50): Promise<RankRow[]> {
  const db = await getDb();
  const conds = [eq(orders.performerId, p.id), eq(orders.status, "paid"), sql`${orders.fanId} is not null`];
  if (period === "month") conds.push(gte(orders.paidAt, startOfMonthTaipei()));
  if (period === "session") {
    const sid = await sessionFor(p);
    if (!sid) return [];
    conds.push(eq(orders.sessionId, sid));
  }
  const rows = await db
    .select({
      fanId: orders.fanId,
      total: sql<number>`sum(${orders.amount})::int`,
      count: sql<number>`count(*)::int`,
      allAnon: sql<boolean>`bool_and(${orders.isAnonymous})`,
      firstAt: sql<Date>`min(${orders.paidAt})`,
    })
    .from(orders)
    .where(and(...conds))
    .groupBy(orders.fanId)
    .orderBy(desc(sql`sum(${orders.amount})`), sql`min(${orders.paidAt})`)
    .limit(limit);
  const ids = rows.map((r) => r.fanId!) as string[];
  if (!ids.length) return [];
  const [fanRows, badges] = await Promise.all([db.select().from(fans).where(inArray(fans.id, ids)), badgesFor(p.id, ids)]);
  return rows.map((r) => {
    const f = fanRows.find((x) => x.id === r.fanId);
    return {
      fanId: r.fanId!,
      name: r.allAnon ? "匿名支持者" : f?.name || "粉絲",
      avatar: r.allAnon ? null : (f?.avatarUrl ?? null),
      total: Number(r.total),
      count: Number(r.count),
      badge: r.allAnon ? null : (badges.get(r.fanId!) ?? null),
    };
  });
}

/** 我的名次與距離上一名還差多少 */
export function myPosition(board: RankRow[], fanId: string | null) {
  if (!fanId) return null;
  const i = board.findIndex((r) => r.fanId === fanId);
  if (i < 0) return { rank: null, total: 0, gap: board.length ? board[board.length - 1].total + 1 : null, target: board.length ? board.length : null };
  return { rank: i + 1, total: board[i].total, gap: i > 0 ? board[i - 1].total - board[i].total + 1 : null, target: i > 0 ? i : null };
}

/** 每位粉絲最高等級的成就徽章（門檻最高的那個） */
export async function badgesFor(performerId: string, fanIds: string[]) {
  const map = new Map<string, string>();
  if (!fanIds.length) return map;
  const db = await getDb();
  const rows = await db
    .select({ fanId: fanAchievements.fanId, emoji: achievements.emoji, kind: achievements.kind, threshold: achievements.threshold })
    .from(fanAchievements)
    .innerJoin(achievements, eq(achievements.id, fanAchievements.achievementId))
    .where(and(eq(fanAchievements.performerId, performerId), inArray(fanAchievements.fanId, fanIds)));
  // 金額門檻優先於次數門檻，同類取最高
  const score = (k: string, t: number) => (k === "total" ? t : t * 100);
  const best = new Map<string, number>();
  for (const r of rows) {
    const s = score(r.kind, r.threshold);
    if ((best.get(r.fanId) ?? -1) < s) {
      best.set(r.fanId, s);
      map.set(r.fanId, r.emoji);
    }
  }
  return map;
}

export async function fanStats(performerId: string, fanId: string) {
  const db = await getDb();
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.amount}),0)::int`, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.performerId, performerId), eq(orders.fanId, fanId), eq(orders.status, "paid")));
  return { total: Number(r.total), count: Number(r.count) };
}

const reached = (a: Achievement, s: { total: number; count: number }) => (a.kind === "count" ? s.count : s.total) >= a.threshold;

async function claimedCount(achievementId: string) {
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(fanAchievements)
    .where(and(eq(fanAchievements.achievementId, achievementId), inArray(fanAchievements.status, ["requested", "redeemed"])));
  return Number(n);
}

/** 付款後檢查成就：新達成的寫入並用 LINE 通知粉絲 */
export async function evaluateAchievements(p: Performer, fanId: string) {
  const db = await getDb();
  const [list, stats, done] = await Promise.all([
    db.select().from(achievements).where(and(eq(achievements.performerId, p.id), eq(achievements.active, true))),
    fanStats(p.id, fanId),
    db.select({ a: fanAchievements.achievementId }).from(fanAchievements).where(and(eq(fanAchievements.performerId, p.id), eq(fanAchievements.fanId, fanId))),
  ]);
  const have = new Set(done.map((d) => d.a));
  const fresh = list.filter((a) => !have.has(a.id) && reached(a, stats));
  if (!fresh.length) return [];
  await db
    .insert(fanAchievements)
    .values(fresh.map((a) => ({ achievementId: a.id, performerId: p.id, fanId })))
    .onConflictDoNothing();
  const [f] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (f) {
    const lines = fresh.map((a) => `${a.emoji}〈${a.name}〉${a.reward ? `\n　獎勵：${a.reward}` : ""}`);
    await pushMessage(f.lineUserId, [
      {
        type: "text",
        text: `🏆 恭喜！你在 ${p.displayName} 達成新成就\n${lines.join("\n")}\n\n${fresh.some((a) => a.reward) ? "到現場打開「我的追蹤」按領取，出示給藝人就能兌換：" : "查看："}${env.baseUrl}/me`,
      },
    ]);
  }
  return fresh;
}

/** 新增成就時，把已經達標的粉絲補上（不推播，粉絲下次打開就會看到） */
export async function backfillAchievement(a: Achievement, dbArg?: DB) {
  // 種子資料在 DB 初始化過程中呼叫，必須直接傳入 db，不能再等 getDb()
  const db = dbArg ?? (await getDb());
  const rows = await db
    .select({ fanId: orders.fanId, total: sql<number>`sum(${orders.amount})::int`, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.performerId, a.performerId), eq(orders.status, "paid"), sql`${orders.fanId} is not null`))
    .groupBy(orders.fanId);
  const qualified = rows.filter((r) => reached(a, { total: Number(r.total), count: Number(r.count) })).map((r) => r.fanId!) as string[];
  if (qualified.length)
    await db
      .insert(fanAchievements)
      .values(qualified.map((fanId) => ({ achievementId: a.id, performerId: a.performerId, fanId })))
      .onConflictDoNothing();
  return qualified.length;
}

/** 本場榜第一名被超越時，通知原本的第一名（競爭感的來源） */
export async function notifyOvertake(p: Performer, o: Order) {
  if (!o.fanId || !o.sessionId || o.isAnonymous) return;
  const board = await leaderboard(p, "session", 5);
  if (board[0]?.fanId !== o.fanId) return;
  // 扣掉這筆之前：其他人裡最高的那位，若不低於付款者原本的金額，就是被超越的人
  const payerBefore = board[0].total - o.amount;
  const prev = board.find((r) => r.fanId !== o.fanId);
  if (!prev || prev.total < payerBefore || prev.total <= 0) return;
  const db = await getDb();
  const [f] = await db.select().from(fans).where(eq(fans.id, prev.fanId));
  if (!f) return;
  const gap = board[0].total - prev.total + 1;
  if (prev.name === "匿名支持者" && !prev.avatar) return;
  await pushMessage(f.lineUserId, [
    { type: "text", text: `🔥 你在 ${p.displayName} 本場支持榜的第 1 名被 ${board[0].name} 超越了！\n再支持 ${nt(gap)} 就能搶回來：${env.baseUrl}/p/${p.slug}?tab=rank` },
  ]);
}

/* ────────────── 粉絲領取、藝人兌換 ────────────── */

export class RewardError extends Error {}

/** 觀眾看某位藝人的成就與自己的進度 */
export async function achievementsWithProgress(p: Performer, fanId: string | null) {
  const db = await getDb();
  const list = await db.select().from(achievements).where(and(eq(achievements.performerId, p.id), eq(achievements.active, true)));
  const stats = fanId ? await fanStats(p.id, fanId) : { total: 0, count: 0 };
  const mine = fanId ? await db.select().from(fanAchievements).where(and(eq(fanAchievements.performerId, p.id), eq(fanAchievements.fanId, fanId))) : [];
  const unlockedCounts = await db
    .select({ a: fanAchievements.achievementId, n: sql<number>`count(*)::int` })
    .from(fanAchievements)
    .where(eq(fanAchievements.performerId, p.id))
    .groupBy(fanAchievements.achievementId);
  return list
    .sort((a, b) => (a.kind === b.kind ? a.threshold - b.threshold : a.kind === "count" ? -1 : 1))
    .map((a) => {
      const m = mine.find((x) => x.achievementId === a.id);
      const cur = a.kind === "count" ? stats.count : stats.total;
      return {
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        kind: a.kind,
        threshold: a.threshold,
        reward: a.reward,
        current: cur,
        unlocked: Number(unlockedCounts.find((u) => u.a === a.id)?.n ?? 0),
        mine: m ? { id: m.id, status: m.status, claimCode: m.claimCode } : null,
      };
    });
}

/** 粉絲按「領取」→ 產生 4 碼兌換碼，通知藝人 */
export async function claimReward(fanId: string, fanAchievementId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ fa: fanAchievements, a: achievements, p: performers })
    .from(fanAchievements)
    .innerJoin(achievements, eq(achievements.id, fanAchievements.achievementId))
    .innerJoin(performers, eq(performers.id, fanAchievements.performerId))
    .where(and(eq(fanAchievements.id, fanAchievementId), eq(fanAchievements.fanId, fanId)));
  if (!row) throw new RewardError("找不到這個成就");
  if (!row.a.reward) throw new RewardError("這個成就沒有附獎勵");
  if (row.fa.status !== "unlocked") return row.fa;
  if (row.a.stock != null && (await claimedCount(row.a.id)) >= row.a.stock) throw new RewardError("獎勵已經兌換完了");
  const code = String(crypto.randomInt(1000, 10000));
  const [fa] = await db
    .update(fanAchievements)
    .set({ status: "requested", claimCode: code, requestedAt: new Date() })
    .where(and(eq(fanAchievements.id, fanAchievementId), eq(fanAchievements.status, "unlocked")))
    .returning();
  const [f] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (row.p.lineUserId && fa) {
    await pushMessage(row.p.lineUserId, [
      {
        type: "text",
        text: `🎁 ${f?.name ?? "粉絲"} 要領取〈${row.a.name}〉獎勵：${row.a.reward}\n兌換碼 ${code}，對方出示後按兌換`,
        quickReply: { items: [{ type: "action", action: { type: "postback", label: `✅ 已兌換 ${code}`, data: `redeem:${fa.id}`, displayText: `已兌換 ${code}` } }] },
      },
    ]);
  }
  return fa ?? row.fa;
}

/** 藝人兌換（後台按鈕或 LINE 快速回覆） */
export async function redeemReward(p: Performer, fanAchievementId: string) {
  const db = await getDb();
  const [fa] = await db
    .update(fanAchievements)
    .set({ status: "redeemed", redeemedAt: new Date() })
    .where(and(eq(fanAchievements.id, fanAchievementId), eq(fanAchievements.performerId, p.id), inArray(fanAchievements.status, ["requested", "unlocked"])))
    .returning();
  if (!fa) throw new RewardError("這筆已兌換或不存在");
  const [row] = await db
    .select({ name: achievements.name, reward: achievements.reward, line: fans.lineUserId })
    .from(fanAchievements)
    .innerJoin(achievements, eq(achievements.id, fanAchievements.achievementId))
    .innerJoin(fans, eq(fans.id, fanAchievements.fanId))
    .where(eq(fanAchievements.id, fa.id));
  if (row) await pushMessage(row.line, [{ type: "text", text: `✅ 已兌換〈${row.name}〉：${row.reward ?? ""}\n謝謝你一直支持 ${p.displayName}！` }]);
  return fa;
}

/** 藝人待兌換清單 */
export async function pendingClaims(p: Performer) {
  const db = await getDb();
  return db
    .select({ id: fanAchievements.id, code: fanAchievements.claimCode, requestedAt: fanAchievements.requestedAt, name: achievements.name, emoji: achievements.emoji, reward: achievements.reward, fanName: fans.name, avatar: fans.avatarUrl })
    .from(fanAchievements)
    .innerJoin(achievements, eq(achievements.id, fanAchievements.achievementId))
    .innerJoin(fans, eq(fans.id, fanAchievements.fanId))
    .where(and(eq(fanAchievements.performerId, p.id), eq(fanAchievements.status, "requested")))
    .orderBy(desc(fanAchievements.requestedAt));
}

/** 觀眾跨藝人的成就與獎勵（我的追蹤頁） */
export async function myRewards(fanId: string) {
  const db = await getDb();
  return db
    .select({
      id: fanAchievements.id,
      status: fanAchievements.status,
      code: fanAchievements.claimCode,
      unlockedAt: fanAchievements.unlockedAt,
      name: achievements.name,
      emoji: achievements.emoji,
      reward: achievements.reward,
      performer: performers.displayName,
      slug: performers.slug,
    })
    .from(fanAchievements)
    .innerJoin(achievements, eq(achievements.id, fanAchievements.achievementId))
    .innerJoin(performers, eq(performers.id, fanAchievements.performerId))
    .where(eq(fanAchievements.fanId, fanId))
    .orderBy(desc(fanAchievements.unlockedAt));
}

/** 預設範本：藝人一鍵套用 */
export const ACHIEVEMENT_TEMPLATES: { name: string; emoji: string; kind: "total" | "count"; threshold: number; reward: string | null }[] = [
  { name: "初次相遇", emoji: "🌱", kind: "count", threshold: 1, reward: null },
  { name: "常客", emoji: "🎧", kind: "count", threshold: 5, reward: "下次免費點一首" },
  { name: "鐵粉", emoji: "🔥", kind: "total", threshold: 1000, reward: "親筆簽名小卡" },
  { name: "超級粉絲", emoji: "👑", kind: "total", threshold: 3000, reward: "合照＋為你唱一首專屬歌" },
];
