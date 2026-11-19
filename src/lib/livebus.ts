import { currentGame } from "./games";
import { getPerformerBySlug, publicState } from "./orders";
import { hubState } from "./hub";
import type { Performer } from "./db/schema";

/**
 * 現場狀態的廣播。
 *
 * 原本每支手機、每面大螢幕各自每 1～5 秒打一次資料庫。一場兩百人的室內場
 * 就是每秒好幾十次查詢，而且全部打在同一個容器上——最熱鬧的那一刻最容易掛。
 *
 * 這裡把它倒過來：**一位表演者只查一次**，結果推給所有正在看的人。
 * 一百個人看同一場，資料庫的負擔和一個人看一樣。
 *
 * 每個人看到的不完全一樣（遊戲裡的「我」排第幾、拿了幾分），所以廣播的是
 * 原始資料，由各自的訂閱者在記憶體裡算出自己的那一份——那是純函式，很便宜。
 */

export type Snapshot = {
  at: number;
  state: Awaited<ReturnType<typeof publicState>>;
  game: Awaited<ReturnType<typeof currentGame>>;
  hub: Awaited<ReturnType<typeof hubState>> | null;
};

type Room = {
  subs: Set<(s: Snapshot) => void>;
  timer: NodeJS.Timeout | null;
  last: Snapshot | null;
  /** 正在抓資料，避免上一輪還沒回來就又發一輪 */
  busy: boolean;
};

const rooms = new Map<string, Room>();

/** 有遊戲在跑時抓快一點，現場的分數要跟得上手指 */
const TICK_IDLE = 4000;
const TICK_GAME = 1200;

async function snap(p: Performer): Promise<Snapshot> {
  const [state, game] = await Promise.all([publicState(p), currentGame(p.id)]);
  return { at: Date.now(), state, game, hub: null };
}

async function tick(slug: string) {
  const room = rooms.get(slug);
  if (!room || room.busy) return;
  room.busy = true;
  try {
    const p = await getPerformerBySlug(slug);
    if (!p) return;
    const s = await snap(p);
    room.last = s;
    for (const fn of room.subs) {
      try {
        fn(s);
      } catch {
        // 單一連線壞掉不該影響其他人
      }
    }
    // 依現在有沒有遊戲調整節奏
    const want = s.game && s.game.status === "running" ? TICK_GAME : TICK_IDLE;
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = setInterval(() => void tick(slug), want);
    }
  } catch {
    // 資料庫抖一下就跳過這一輪，下一輪會補上
  } finally {
    room.busy = false;
  }
}

/**
 * 訂閱某位表演者的現場狀態。回傳取消訂閱的函式。
 * 第一個人進來才開始查，最後一個人離開就停——沒有人看的時候完全不耗資源。
 */
export function subscribe(slug: string, fn: (s: Snapshot) => void) {
  let room = rooms.get(slug);
  if (!room) {
    room = { subs: new Set(), timer: null, last: null, busy: false };
    rooms.set(slug, room);
  }
  room.subs.add(fn);
  if (!room.timer) {
    room.timer = setInterval(() => void tick(slug), TICK_IDLE);
    void tick(slug);
  } else if (room.last) {
    // 新來的人先收一份目前的狀態，不必等下一輪
    queueMicrotask(() => fn(room!.last!));
  }

  return () => {
    const r = rooms.get(slug);
    if (!r) return;
    r.subs.delete(fn);
    if (r.subs.size === 0) {
      if (r.timer) clearInterval(r.timer);
      rooms.delete(slug);
    }
  };
}

/** 有人點歌、付費加成、按了開始唱——立刻推一次，不等下一輪 */
export function bump(slug: string) {
  if (rooms.has(slug)) void tick(slug);
}

/** 給 /admin/system 看：現在有幾場在廣播、總共多少人在看 */
export function busStats() {
  let viewers = 0;
  for (const r of rooms.values()) viewers += r.subs.size;
  return { rooms: rooms.size, viewers };
}
