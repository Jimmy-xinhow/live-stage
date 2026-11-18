import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { chatMessages, checkins, fans, hands, liveSessions, lotteries, lotteryEntries, performers, wishes, wishVotes, type Performer } from "./db/schema";
import { pushMessage } from "./line";
import { env } from "./env";

export class HubError extends Error {}

export const HAND_LABEL: Record<string, string> = { sing: "合唱", ask: "提問", wish: "祝福" };
const WISH_WEEKLY = 3;

/** 觀眾看到的現場互動狀態 */
/** 直播聊天室熱度前三（留言數） */
async function chatTop(performerId: string, sessionId: string) {
  const db = await getDb();
  const rows = await db
    .select({ author: chatMessages.author, n: sql<number>`count(*)::int` })
    .from(chatMessages)
    .where(and(eq(chatMessages.performerId, performerId), eq(chatMessages.sessionId, sessionId)))
    .groupBy(chatMessages.author)
    .orderBy(desc(sql`count(*)`))
    .limit(3);
  return rows.map((r) => ({ name: r.author, count: Number(r.n) }));
}

export async function hubState(p: Performer, fanId: string | null) {
  const db = await getDb();
  const sid = p.liveSessionId;
  const [session] = sid ? await db.select().from(liveSessions).where(eq(liveSessions.id, sid)) : [];
  const [[present], mine, [stamps], [lot], myHand, [handCount], wishList, myVotes] = await Promise.all([
    sid ? db.select({ n: sql<number>`count(*)::int` }).from(checkins).where(eq(checkins.sessionId, sid)) : [{ n: 0 }],
    sid && fanId ? db.select().from(checkins).where(and(eq(checkins.sessionId, sid), eq(checkins.fanId, fanId))) : [],
    fanId ? db.select({ n: sql<number>`count(*)::int` }).from(checkins).where(and(eq(checkins.performerId, p.id), eq(checkins.fanId, fanId))) : [{ n: 0 }],
    sid ? db.select().from(lotteries).where(eq(lotteries.sessionId, sid)).orderBy(desc(lotteries.createdAt)).limit(1) : [],
    sid && fanId ? db.select().from(hands).where(and(eq(hands.sessionId, sid), eq(hands.fanId, fanId))).orderBy(desc(hands.createdAt)).limit(1) : [],
    sid ? db.select({ n: sql<number>`count(*)::int` }).from(hands).where(and(eq(hands.sessionId, sid), eq(hands.status, "waiting"))) : [{ n: 0 }],
    db.select().from(wishes).where(eq(wishes.performerId, p.id)).orderBy(desc(wishes.votes), desc(wishes.createdAt)).limit(40),
    fanId ? db.select({ id: wishVotes.wishId }).from(wishVotes).innerJoin(wishes, eq(wishes.id, wishVotes.wishId)).where(and(eq(wishVotes.fanId, fanId), eq(wishes.performerId, p.id))) : [],
  ]);
  let lottery: null | { id: string; prize: string; status: string; endsAt: string; entries: number; joined: boolean; winner: string | null; won: boolean } = null;
  if (lot) {
    const [[e], joined, [w]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(lotteryEntries).where(eq(lotteryEntries.lotteryId, lot.id)),
      fanId ? db.select().from(lotteryEntries).where(and(eq(lotteryEntries.lotteryId, lot.id), eq(lotteryEntries.fanId, fanId))) : [],
      lot.winnerFanId ? db.select({ name: fans.name }).from(fans).where(eq(fans.id, lot.winnerFanId)) : [],
    ]);
    lottery = { id: lot.id, prize: lot.prize, status: lot.status, endsAt: lot.endsAt.toISOString(), entries: Number(e.n), joined: joined.length > 0, winner: w?.name ?? null, won: !!fanId && lot.winnerFanId === fanId };
  }
  return {
    live: !!sid,
    location: session?.location ?? "",
    hype: Math.min(100, session?.hype ?? 0),
    present: Number(present.n),
    checked: mine.length > 0,
    stamps: Number(stamps.n),
    lottery,
    hand: myHand[0] ? { kind: myHand[0].kind, status: myHand[0].status } : null,
    handsWaiting: Number(handCount.n),
    wishes: wishList.map((w) => ({ id: w.id, title: w.title, status: w.status, votes: w.votes, note: w.note, mine: myVotes.some((v) => v.id === w.id) })),
    chat: sid ? await chatTop(p.id, sid) : [],
  };
}
export type HubState = Awaited<ReturnType<typeof hubState>>;

function needLive(p: Performer) {
  if (!p.liveSessionId) throw new HubError("演出結束了，追蹤表演者就會收到下次開演通知");
  return p.liveSessionId;
}

/** 應援：免費，每次點按 +1，集滿 100 */
export async function cheer(p: Performer, n = 1) {
  const sid = needLive(p);
  const db = await getDb();
  // 來路不明的 n（undefined、NaN、字串）一律當 1。不擋的話會變成 NaN 丟進 SQL，
  // 整個請求 500，而且錯誤訊息完全看不出是這裡。
  const add = Math.max(1, Math.min(20, Math.floor(Number(n)) || 1));
  const [s] = await db.update(liveSessions).set({ hype: sql`least(100, ${liveSessions.hype} + ${add})` }).where(eq(liveSessions.id, sid)).returning({ hype: liveSessions.hype });
  return s?.hype ?? 0;
}

/** 簽到：只在演出中、每場一次 */
export async function checkIn(p: Performer, fanId: string) {
  const sid = needLive(p);
  const db = await getDb();
  await db.insert(checkins).values({ sessionId: sid, performerId: p.id, fanId }).onConflictDoNothing();
}

export async function raiseHand(p: Performer, fanId: string, kind: string, text: string) {
  const sid = needLive(p);
  if (!HAND_LABEL[kind]) throw new HubError("類型不正確");
  const db = await getDb();
  const [w] = await db.select().from(hands).where(and(eq(hands.sessionId, sid), eq(hands.fanId, fanId), eq(hands.status, "waiting")));
  if (w) throw new HubError("你已經舉手了，等表演者點到你");
  await db.insert(hands).values({ sessionId: sid, performerId: p.id, fanId, kind, text: text.trim().slice(0, 80) });
}

export async function joinLottery(p: Performer, fanId: string) {
  const sid = needLive(p);
  const db = await getDb();
  const [lot] = await db.select().from(lotteries).where(and(eq(lotteries.sessionId, sid), eq(lotteries.status, "open"))).orderBy(desc(lotteries.createdAt)).limit(1);
  if (!lot) throw new HubError("目前沒有抽獎");
  const [c] = await db.select().from(checkins).where(and(eq(checkins.sessionId, sid), eq(checkins.fanId, fanId)));
  if (!c) throw new HubError("先簽到才能參加抽獎");
  await db.insert(lotteryEntries).values({ lotteryId: lot.id, fanId }).onConflictDoNothing();
}

export async function addWish(p: Performer, fanId: string, title: string) {
  const t = title.trim().slice(0, 60);
  if (t.length < 1) throw new HubError("請輸入歌名");
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(wishVotes)
    .innerJoin(wishes, eq(wishes.id, wishVotes.wishId))
    .where(and(eq(wishVotes.fanId, fanId), eq(wishes.performerId, p.id), sql`${wishVotes.createdAt} > now() - interval '7 days'`));
  if (Number(n) >= WISH_WEEKLY) throw new HubError(`每週最多許 ${WISH_WEEKLY} 個願望`);
  const [same] = await db.select().from(wishes).where(and(eq(wishes.performerId, p.id), sql`lower(${wishes.title}) = lower(${t})`));
  if (same) return voteWish(p, fanId, same.id, true);
  const [w] = await db.insert(wishes).values({ performerId: p.id, title: t }).returning();
  await db.insert(wishVotes).values({ wishId: w.id, fanId });
}

export async function voteWish(p: Performer, fanId: string, wishId: string, on: boolean) {
  const db = await getDb();
  const [w] = await db.select().from(wishes).where(and(eq(wishes.id, wishId), eq(wishes.performerId, p.id)));
  if (!w) throw new HubError("找不到這個願望");
  if (on) {
    const r = await db.insert(wishVotes).values({ wishId, fanId }).onConflictDoNothing().returning();
    if (r.length) await db.update(wishes).set({ votes: sql`${wishes.votes} + 1` }).where(eq(wishes.id, wishId));
  } else {
    const r = await db.delete(wishVotes).where(and(eq(wishVotes.wishId, wishId), eq(wishVotes.fanId, fanId))).returning();
    if (r.length) await db.update(wishes).set({ votes: sql`greatest(0, ${wishes.votes} - 1)` }).where(eq(wishes.id, wishId));
  }
}

/* ────────────── 表演者端 ────────────── */

export async function consoleState(p: Performer) {
  const db = await getDb();
  const base = await hubState(p, null);
  const list = p.liveSessionId
    ? await db
        .select({ id: hands.id, kind: hands.kind, text: hands.text, status: hands.status, name: fans.name })
        .from(hands)
        .innerJoin(fans, eq(fans.id, hands.fanId))
        .where(eq(hands.sessionId, p.liveSessionId))
        .orderBy(desc(hands.createdAt))
        .limit(30)
    : [];
  return { ...base, hands: list };
}

export async function startLottery(p: Performer, prize: string, minutes: number) {
  const sid = needLive(p);
  const db = await getDb();
  await db.update(lotteries).set({ status: "drawn" }).where(and(eq(lotteries.sessionId, sid), eq(lotteries.status, "open")));
  await db.insert(lotteries).values({ sessionId: sid, performerId: p.id, prize: prize.trim().slice(0, 40) || "免費點一首", endsAt: new Date(Date.now() + Math.max(1, Math.min(30, minutes)) * 60_000) });
}

export async function drawLottery(p: Performer) {
  const sid = needLive(p);
  const db = await getDb();
  const [lot] = await db.select().from(lotteries).where(and(eq(lotteries.sessionId, sid), eq(lotteries.status, "open"))).orderBy(desc(lotteries.createdAt)).limit(1);
  if (!lot) throw new HubError("沒有進行中的抽獎");
  const entries = await db.select({ fanId: lotteryEntries.fanId }).from(lotteryEntries).where(eq(lotteryEntries.lotteryId, lot.id));
  if (!entries.length) throw new HubError("還沒有人參加");
  const { randomInt } = await import("node:crypto");
  const winner = entries[randomInt(entries.length)].fanId;
  await db.update(lotteries).set({ status: "drawn", winnerFanId: winner }).where(eq(lotteries.id, lot.id));
  const [f] = await db.select().from(fans).where(eq(fans.id, winner));
  if (f) await pushMessage(f.lineUserId, [{ type: "text", text: `你抽中了 ${p.displayName} 的「${lot.prize}」！請到台前找表演者領取。\n${env.baseUrl}/p/${p.slug}/hub` }]).catch(() => null);
  return f?.name ?? "";
}

export async function pickHand(p: Performer, handId: string) {
  const db = await getDb();
  const [h] = await db.update(hands).set({ status: "picked" }).where(and(eq(hands.id, handId), eq(hands.performerId, p.id))).returning();
  if (!h) throw new HubError("找不到");
  const [f] = await db.select().from(fans).where(eq(fans.id, h.fanId));
  if (f) await pushMessage(f.lineUserId, [{ type: "text", text: `${p.displayName} 點到你了（${HAND_LABEL[h.kind]}）！請舉手讓表演者看到你。` }]).catch(() => null);
}

export async function resetHype(p: Performer) {
  if (!p.liveSessionId) return;
  const db = await getDb();
  await db.update(liveSessions).set({ hype: 0 }).where(eq(liveSessions.id, p.liveSessionId));
}

export async function setWishStatus(p: Performer, wishId: string, status: "open" | "practice" | "done", note = "") {
  const db = await getDb();
  const [w] = await db.update(wishes).set({ status, note: note.slice(0, 100) }).where(and(eq(wishes.id, wishId), eq(wishes.performerId, p.id))).returning();
  if (!w) throw new HubError("找不到");
  if (status === "done") {
    const voters = await db.select({ line: fans.lineUserId }).from(wishVotes).innerJoin(fans, eq(fans.id, wishVotes.fanId)).where(eq(wishVotes.wishId, wishId));
    for (const v of voters) await pushMessage(v.line, [{ type: "text", text: `你許願的〈${w.title}〉，${p.displayName} 學會了！下次演出就能點。\n${env.baseUrl}/p/${p.slug}` }]).catch(() => null);
  }
}

/** 演出護照：跨表演者的簽到章 */
export async function passport(fanId: string) {
  const db = await getDb();
  const rows = await db
    .select({ pid: checkins.performerId, n: sql<number>`count(*)::int`, last: sql<string>`max(${checkins.createdAt})` })
    .from(checkins)
    .where(eq(checkins.fanId, fanId))
    .groupBy(checkins.performerId);
  if (!rows.length) return { total: 0, level: 1, levelName: LEVELS[0].name, next: LEVELS[1].min, cards: [] };
  const ps = await db.select({ id: performers.id, slug: performers.slug, name: performers.displayName, live: performers.liveSessionId }).from(performers).where(inArray(performers.id, rows.map((r) => r.pid)));
  const total = rows.reduce((a, r) => a + Number(r.n), 0);
  const li = LEVELS.reduce((a, l, i) => (total >= l.min ? i : a), 0);
  return {
    total, level: li + 1, levelName: LEVELS[li].name, next: LEVELS[li + 1]?.min ?? null,
    cards: rows.map((r) => { const p = ps.find((x) => x.id === r.pid)!; return { slug: p.slug, name: p.name, live: !!p.live, stamps: Number(r.n) }; }).sort((a, b) => b.stamps - a.stamps),
  };
}
const LEVELS = [{ min: 0, name: "新觀眾" }, { min: 3, name: "熟面孔" }, { min: 10, name: "現場常客" }, { min: 30, name: "街頭老江湖" }];
