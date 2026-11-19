import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "./db";
import { fans, games, performers, type Game, type GameState, type Performer, type QuizQuestion, type WheelEntry } from "./db/schema";
import { env } from "./env";
import { track } from "./usage";

export class GameError extends Error {}

/**
 * 互動遊戲共用一套「跑道」引擎：每條跑道一個分數，觀眾免費點按加分，付費加成直接加大量分數。
 * battle 兵團對戰（2 隊，時間到分數高者贏）｜tug 拔河（2 隊，差距達標或時間到）｜race 歌曲賽跑（3–4 條，先到目標）
 * siege 攻城（1 條，全場合作打到目標）｜goal 集氣解鎖（1 條，只算付費金額）
 */
export const GAME_TYPES = {
  battle: { name: "兵團對戰", desc: "兩隊派兵互打，時間到戰力高的贏", lanes: [2, 2], tap: 10, cooldown: 3000, goal: 0, paid: true },
  tug: { name: "拔河大賽", desc: "兩隊狂點手機，把繩子拉過來", lanes: [2, 2], tap: 1, cooldown: 0, goal: 300, paid: true },
  race: { name: "歌曲賽跑", desc: "幾首歌賽跑，先到終點的就唱", lanes: [2, 4], tap: 1, cooldown: 0, goal: 200, paid: true },
  siege: { name: "攻城魔王戰", desc: "全場一起打，攻下就解鎖驚喜", lanes: [1, 1], tap: 10, cooldown: 3000, goal: 5000, paid: true },
  goal: { name: "集氣解鎖", desc: "支持累積到目標金額就解鎖", lanes: [1, 1], tap: 0, cooldown: 0, goal: 1000, paid: true },
  quiz: { name: "猜歌王・鐵粉測驗", desc: "出題搶答，比快也比準，完全免費", lanes: [1, 1], tap: 0, cooldown: 0, goal: 0, paid: false },
  wheel: { name: "命運轉盤", desc: "觀眾投稿挑戰，你審核後轉盤決定，完全免費", lanes: [1, 1], tap: 0, cooldown: 0, goal: 0, paid: false },
  pk: { name: "跨表演者 PK", desc: "和另一位正在演出的表演者對決，兩邊粉絲各自助攻", lanes: [2, 2], tap: 10, cooldown: 3000, goal: 0, paid: true },
} as const;
export type GameType = keyof typeof GAME_TYPES;

/** 付費加成：每次都是一筆直接付給表演者的支持，付款確認後立刻生效，遊戲結束不保留 */
export const UNITS: Record<GameType, { id: string; name: string; price: number; power: number; desc: string }[]> = {
  battle: [
    { id: "knight", name: "騎士", price: 50, power: 150, desc: "大螢幕顯示你的名字" },
    { id: "catapult", name: "投石車", price: 100, power: 400, desc: "直接打對方城牆" },
    { id: "dragon", name: "巨龍", price: 500, power: 1000, desc: "全場特效，表演者唸你的名字" },
  ],
  siege: [
    { id: "knight", name: "騎士", price: 50, power: 150, desc: "大螢幕顯示你的名字" },
    { id: "catapult", name: "投石車", price: 100, power: 400, desc: "直接打城牆" },
    { id: "dragon", name: "巨龍", price: 500, power: 1000, desc: "全場特效" },
  ],
  tug: [{ id: "strong", name: "大力士", price: 100, power: 60, desc: "一口氣拉一大段" }],
  race: [
    { id: "sprint", name: "衝刺", price: 50, power: 15, desc: "前進 15 步" },
    { id: "rocket", name: "火箭", price: 200, power: 80, desc: "前進 80 步，名字上螢幕" },
  ],
  goal: [],
  quiz: [],
  wheel: [],
  pk: [
    { id: "knight", name: "應援旗", price: 50, power: 150, desc: "大螢幕顯示你的名字" },
    { id: "catapult", name: "加油棒", price: 100, power: 400, desc: "一次拉開差距" },
    { id: "dragon", name: "全場合唱", price: 500, power: 1000, desc: "全場特效，表演者唸你的名字" },
  ],
};
/** 免費點按最多占一條跑道分數的比例，避免結果與支持無關 */
const FREE_CAP = 0.3;

export async function currentGame(performerId: string) {
  const db = await getDb();
  const [g] = await db
    .select()
    .from(games)
    .where(or(eq(games.performerId, performerId), eq(games.opponentId, performerId)))
    .orderBy(desc(games.createdAt))
    .limit(1);
  if (!g) return null;
  if (g.status === "running" && g.endsAt.getTime() <= Date.now()) return finish(g);
  return g;
}

function winnerOf(g: Game): number | null {
  const t = GAME_TYPES[g.type as GameType];
  if (g.type === "quiz" || g.type === "wheel") return null;
  const s = g.state.lanes.map((l) => l.score);
  if (g.type === "siege" || g.type === "goal") return s[0] >= g.config.goal ? 0 : null;
  const max = Math.max(...s);
  if (s.filter((x) => x === max).length > 1) return null;
  return t ? s.indexOf(max) : null;
}

async function finish(g: Game) {
  const db = await getDb();
  const state = { ...g.state, winner: winnerOf(g) };
  const [row] = await db.update(games).set({ status: "ended", state }).where(and(eq(games.id, g.id), eq(games.status, "running"))).returning();
  return row ?? { ...g, status: "ended", state };
}

export async function startGame(p: Performer, type: GameType, input: { lanes: string[]; reward: string; minutes: number; goal?: number; questions?: QuizQuestion[]; opponentSlug?: string }) {
  const t = GAME_TYPES[type];
  if (!t) throw new GameError("沒有這個遊戲");
  if (!p.liveSessionId) throw new GameError("開演後才能開始遊戲");
  let opponent: Performer | null = null;
  if (type === "pk") {
    const db0 = await getDb();
    const slug = (input.opponentSlug ?? "").trim().toLowerCase();
    if (!slug) throw new GameError("請選一位對手");
    const [o] = await db0.select().from(performers).where(and(eq(performers.slug, slug), eq(performers.accountType, "performer")));
    if (!o) throw new GameError("找不到這位表演者");
    if (o.id === p.id) throw new GameError("不能跟自己 PK");
    if (!o.liveSessionId) throw new GameError("對方現在沒有在演出，等他開演再約");
    const busy = await currentGame(o.id);
    if (busy && busy.status === "running") throw new GameError("對方正在進行另一場遊戲");
    opponent = o;
    input = { ...input, lanes: [p.displayName, o.displayName] };
  }
  const names = input.lanes.map((x) => x.trim().slice(0, 20)).filter(Boolean);
  if (names.length < t.lanes[0] || names.length > t.lanes[1]) throw new GameError(t.lanes[1] === 1 ? "請填一個名稱" : `需要 ${t.lanes[0]}${t.lanes[0] === t.lanes[1] ? "" : `–${t.lanes[1]}`} 個隊伍或選項`);
  let questions: QuizQuestion[] | undefined;
  if (type === "quiz") {
    questions = (input.questions ?? [])
      .map((q) => ({ q: String(q.q ?? "").trim().slice(0, 80), options: (q.options ?? []).map((o) => String(o).trim().slice(0, 40)).filter(Boolean).slice(0, 4), answer: Number(q.answer) || 0 }))
      .filter((q) => q.q && q.options.length >= 2 && q.answer < q.options.length)
      .slice(0, 20);
    if (!questions.length) throw new GameError("至少要有一題（題目、2–4 個選項、標出正解）");
  }
  const db = await getDb();
  await db.update(games).set({ status: "ended" }).where(and(or(eq(games.performerId, p.id), eq(games.opponentId, p.id)), eq(games.status, "running")));
  const state: GameState = { lanes: names.map((name) => ({ name, score: 0, players: 0 })), players: {}, feed: [], winner: null };
  if (type === "quiz") state.quiz = { idx: 0, phase: "lobby", openedAt: 0, secs: 15, players: {} };
  if (type === "wheel") state.wheel = { entries: [], resultId: null, spunAt: 0 };
  const [g] = await db
    .insert(games)
    .values({ performerId: p.id, opponentId: opponent?.id ?? null, sessionId: p.liveSessionId, type, config: { reward: input.reward.trim().slice(0, 60), goal: input.goal && input.goal > 0 ? Math.floor(input.goal) : t.goal, questions }, state, endsAt: new Date(Date.now() + Math.max(1, Math.min(30, input.minutes)) * 60_000) })
    .returning();
  track("game_start", p.id);
  // 原本會推播通知對手。現在對手的控制台一進去就看得到這場 PK，
  // 而 PK 本來就是兩邊講好才開的。
  return g;
}

export async function endGame(p: Performer) {
  const g = await currentGame(p.id);
  if (!g || g.status !== "running") return g;
  return finish(g);
}

/** 在交易內鎖住遊戲列再改分數，避免同時點按互相覆蓋 */
async function mutate(gameId: string, fn: (g: Game) => GameState | null) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [g] = await tx.select().from(games).where(eq(games.id, gameId)).for("update");
    if (!g || g.status !== "running" || g.endsAt.getTime() <= Date.now()) return null;
    const state = fn(g);
    if (!state) return g;
    const t = GAME_TYPES[g.type as GameType];
    const next = { ...g, state };
    const reached = t.goal > 0 || g.type === "siege" || g.type === "goal";
    let done = false;
    if (g.type === "tug") done = Math.abs(state.lanes[0].score - state.lanes[1].score) >= g.config.goal;
    else if (reached && g.config.goal > 0) done = state.lanes.some((l) => l.score >= g.config.goal);
    if (done) state.winner = g.type === "tug" ? (state.lanes[0].score > state.lanes[1].score ? 0 : 1) : state.lanes.findIndex((l) => l.score >= g.config.goal);
    const [row] = await tx.update(games).set({ state, ...(done ? { status: "ended" } : {}) }).where(eq(games.id, g.id)).returning();
    return row ?? next;
  });
}

function player(state: GameState, fanId: string, name: string, lane: number) {
  let pl = state.players[fanId];
  if (!pl) {
    pl = state.players[fanId] = { name, lane, score: 0, taps: 0, last: 0 };
    state.lanes[lane].players += 1;
  }
  return pl;
}

/** 免費點按 */
export async function tap(gameId: string, fanId: string, lane: number, count = 1) {
  const db = await getDb();
  const [f] = await db.select({ name: fans.name }).from(fans).where(eq(fans.id, fanId));
  return mutate(gameId, (g) => {
    const t = GAME_TYPES[g.type as GameType];
    if (!t.tap) throw new GameError("這個遊戲只計算支持金額");
    const state = structuredClone(g.state);
    if (!state.lanes[lane]) throw new GameError("隊伍不存在");
    const pl = player(state, fanId, f?.name || "觀眾", lane);
    const now = Date.now();
    if (t.cooldown && now - pl.last < t.cooldown) return null;
    const n = t.cooldown ? 1 : Math.max(1, Math.min(12, Math.floor(count)));
    let add = t.tap * n;
    // 免費分數上限：該跑道已有分數時，免費累積不超過總分的三成（至少保留起步的 200 分）
    const freeSoFar = Object.values(state.players).filter((x) => x.lane === pl.lane).reduce((a, x) => a + x.taps * t.tap, 0);
    const laneScore = state.lanes[pl.lane].score;
    const cap = Math.max(200, (laneScore - freeSoFar) * (FREE_CAP / (1 - FREE_CAP)));
    if (t.cooldown && freeSoFar + add > cap) add = 0;
    pl.last = now;
    pl.taps += n;
    pl.score += add;
    state.lanes[pl.lane].score += add;
    return state;
  });
}

/** 付費加成（付款確認後呼叫） */
export async function applyBoost(gameId: string, fanId: string | null, name: string, lane: number, unitId: string, amount: number) {
  return mutate(gameId, (g) => {
    const state = structuredClone(g.state);
    const li = state.lanes[lane] ? lane : 0;
    const unit = UNITS[g.type as GameType]?.find((u) => u.id === unitId);
    const power = g.type === "goal" ? amount : unit ? Math.round(unit.power * Math.max(1, amount / unit.price)) : amount;
    state.lanes[li].score += power;
    if (fanId) {
      const pl = player(state, fanId, name || "觀眾", li);
      pl.score += power;
    }
    state.feed = [{ t: Date.now(), text: `${name || "有人"} ${g.type === "goal" ? `支持 NT$${amount}` : `派出${unit?.name ?? "援軍"}`}`, lane: li }, ...state.feed].slice(0, 6);
    return state;
  });
}

/* ────────────── 猜歌王／鐵粉測驗（完全免費，以答對與速度計分） ────────────── */

/** 表演者控制：出下一題、開放作答、公布答案 */
export async function quizControl(gameId: string, action: "open" | "reveal" | "next", secs = 15) {
  return mutate(gameId, (g) => {
    if (g.type !== "quiz" || !g.state.quiz) throw new GameError("這不是問答遊戲");
    const state = structuredClone(g.state);
    const q = state.quiz!;
    const total = g.config.questions?.length ?? 0;
    if (action === "open") { q.phase = "open"; q.openedAt = Date.now(); q.secs = Math.max(5, Math.min(60, secs)); }
    else if (action === "reveal") q.phase = "reveal";
    else { if (q.idx + 1 >= total) throw new GameError("已經是最後一題"); q.idx += 1; q.phase = "lobby"; q.openedAt = 0; }
    return state;
  });
}

/** 觀眾作答：答對得分，越快分數越高（基本 100 分，每秒扣 5，最低 50） */
export async function quizAnswer(gameId: string, fanId: string, name: string, pick: number) {
  return mutate(gameId, (g) => {
    if (g.type !== "quiz" || !g.state.quiz) throw new GameError("這不是問答遊戲");
    const state = structuredClone(g.state);
    const q = state.quiz!;
    const cur = g.config.questions?.[q.idx];
    if (!cur) throw new GameError("沒有題目");
    if (q.phase !== "open") throw new GameError("現在不能作答");
    const key = String(q.idx);
    const pl = (q.players[fanId] ??= { name: name || "觀眾", score: 0, picks: {} });
    if (pl.picks[key] != null) throw new GameError("這題你已經答過了");
    pl.name = name || pl.name;
    pl.picks[key] = pick;
    if (pick === cur.answer) {
      const secs = Math.floor((Date.now() - q.openedAt) / 1000);
      pl.score += Math.max(50, 100 - secs * 5);
    }
    state.lanes[0].score = Object.values(q.players).reduce((a, x) => a + x.score, 0);
    state.lanes[0].players = Object.keys(q.players).length;
    return state;
  });
}

/* ────────────── 命運轉盤（完全免費，觀眾投稿、表演者審核、觀眾無獎品） ────────────── */

export async function wheelSubmit(gameId: string, fanId: string, name: string, text: string) {
  const t = text.trim().slice(0, 40);
  if (!t) throw new GameError("請寫下你的挑戰");
  return mutate(gameId, (g) => {
    if (g.type !== "wheel" || !g.state.wheel) throw new GameError("這不是轉盤遊戲");
    const state = structuredClone(g.state);
    const w = state.wheel!;
    if (w.entries.filter((e) => e.fanId === fanId).length >= 2) throw new GameError("每個人最多投稿 2 個");
    if (w.entries.length >= 40) throw new GameError("投稿已滿");
    w.entries.push({ id: Math.random().toString(36).slice(2, 10), fanId, name: name || "觀眾", text: t, status: "pending" });
    return state;
  });
}

export async function wheelReview(gameId: string, entryId: string, approve: boolean) {
  return mutate(gameId, (g) => {
    if (g.type !== "wheel" || !g.state.wheel) throw new GameError("這不是轉盤遊戲");
    const state = structuredClone(g.state);
    const e = state.wheel!.entries.find((x) => x.id === entryId);
    if (!e) throw new GameError("找不到這個投稿");
    e.status = approve ? "approved" : "rejected";
    return state;
  });
}

/** 轉盤：只從審核通過的項目裡隨機挑一個，完全免費、沒有獎品 */
export async function wheelSpin(gameId: string) {
  return mutate(gameId, (g) => {
    if (g.type !== "wheel" || !g.state.wheel) throw new GameError("這不是轉盤遊戲");
    const state = structuredClone(g.state);
    const ok = state.wheel!.entries.filter((e) => e.status === "approved");
    if (!ok.length) throw new GameError("還沒有通過審核的項目");
    const pick = ok[Math.floor(Math.random() * ok.length)];
    state.wheel!.resultId = pick.id;
    state.wheel!.spunAt = Date.now();
    state.feed = [{ t: Date.now(), text: `轉到「${pick.text}」（${pick.name} 投稿）`, lane: 0 }, ...state.feed].slice(0, 6);
    return state;
  });
}

export function publicWheel(entries: WheelEntry[], fanId: string | null) {
  return entries.map((e) => ({ id: e.id, name: e.name, text: e.text, status: e.status, mine: !!fanId && e.fanId === fanId }));
}

/** 給觀眾與大螢幕的公開狀態 */
export function publicGame(g: Game | null, fanId: string | null, viewerPerformerId?: string) {
  if (!g) return null;
  const t = GAME_TYPES[g.type as GameType];
  const players = Object.entries(g.state.players).map(([id, pl]) => ({ id, ...pl }));
  const qz = g.state.quiz;
  const top = (lane: number) => players.filter((x) => x.lane === lane).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => ({ name: x.name, score: x.score }));
  const me = fanId ? players.find((x) => x.id === fanId) : null;
  return {
    id: g.id, type: g.type, name: t.name, status: g.status,
    lockedLane: g.opponentId && viewerPerformerId ? (viewerPerformerId === g.performerId ? 0 : 1) : null, endsAt: g.endsAt.toISOString(), reward: g.config.reward, goal: g.config.goal,
    tapPower: t.tap, cooldown: t.cooldown,
    lanes: g.state.lanes.map((l, i) => ({ ...l, top: top(i) })),
    feed: g.state.feed, winner: g.state.winner,
    units: UNITS[g.type as GameType],
    quiz: qz
      ? {
          idx: qz.idx,
          total: g.config.questions?.length ?? 0,
          phase: qz.phase,
          secs: qz.secs,
          openedAt: qz.openedAt,
          question: g.config.questions?.[qz.idx]
            ? { q: g.config.questions[qz.idx].q, options: g.config.questions[qz.idx].options, answer: qz.phase === "reveal" ? g.config.questions[qz.idx].answer : null }
            : null,
          board: Object.entries(qz.players).map(([id, x]) => ({ name: x.name, score: x.score, isMe: id === fanId })).sort((a, b) => b.score - a.score).slice(0, 8),
          mine: fanId && qz.players[fanId] ? { score: qz.players[fanId].score, picked: qz.players[fanId].picks[String(qz.idx)] ?? null } : null,
          answered: Object.values(qz.players).filter((x) => x.picks[String(qz.idx)] != null).length,
        }
      : null,
    wheel: g.state.wheel ? { entries: publicWheel(g.state.wheel.entries, fanId), resultId: g.state.wheel.resultId, spunAt: g.state.wheel.spunAt } : null,
    me: me ? { lane: me.lane, score: me.score, taps: me.taps, rank: players.filter((x) => x.lane === me.lane && x.score > me.score).length + 1 } : null,
  };
}
export type PublicGame = NonNullable<ReturnType<typeof publicGame>>;
