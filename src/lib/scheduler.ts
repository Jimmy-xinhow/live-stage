import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { runMaintenance } from "./maintenance";
import { runPlanRenewals } from "./subscription";
import { reportError } from "./errors";

/**
 * 內建排程。
 *
 * 原本要在外面掛一個每小時呼叫 /api/cron 的服務。少一個外部相依就少一件
 * 會忘記設定的事——而「忘記設定」的後果是逾時訂單不會收、方案不會續期，
 * 而且沒有任何人會發現。
 *
 * 多個實例同時跑的問題用 Postgres 的諮詢鎖解決：誰先拿到誰跑，拿不到的
 * 直接跳過這一輪。鎖是試著拿（try），不是等——等下去只會讓兩個實例輪流跑。
 */
const LOCK = 727002;
const EVERY = 60 * 60_000;

/**
 * 狀態掛在 globalThis：啟動時跑 startScheduler 的是 instrumentation 的 bundle，
 * 讀 schedulerStatus 的是 /api/health 的 bundle。模組變數在這兩邊各有一份，
 * 健康檢查會永遠回報「沒在跑」，即使排程好好的。
 */
type SchedState = { timer: NodeJS.Timeout | null; lastRun: { at: string; ok: boolean; detail?: unknown } | null };
const g = globalThis as unknown as { __sched?: SchedState };
const st: SchedState = (g.__sched ??= { timer: null, lastRun: null });

export const schedulerStatus = () => ({ running: !!st.timer, lastRun: st.lastRun });

async function withLock<T>(fn: () => Promise<T>) {
  const db = await getDb();
  // 拿不到鎖代表另一個實例正在跑這一輪，直接跳過。
  // 取不到結果（例如開發用的 PGlite 不支援）就當作可以跑。
  const out = await db.execute(sql`select pg_try_advisory_lock(${LOCK}) as got`).catch(() => null);
  const rows = (Array.isArray(out) ? out : (out as { rows?: { got: boolean }[] } | null)?.rows) ?? null;
  const got = rows?.[0]?.got ?? true;
  if (!got) return null;
  try {
    return await fn();
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK})`).catch(() => null);
  }
}

async function tick() {
  try {
    const out = await withLock(async () => {
      const maintenance = await runMaintenance();
      const plans = await runPlanRenewals();
      return { maintenance, plans };
    });
    if (out) st.lastRun = { at: new Date().toISOString(), ok: true, detail: out };
  } catch (e) {
    st.lastRun = { at: new Date().toISOString(), ok: false, detail: String(e) };
    reportError("scheduler", e);
  }
}

/** 啟動時呼叫一次。開發環境不跑，免得每次存檔都觸發 */
export function startScheduler() {
  if (st.timer || process.env.NODE_ENV !== "production") return;
  // 開機後等一分鐘再跑第一次，讓容器先把流量接起來
  setTimeout(() => void tick(), 60_000);
  st.timer = setInterval(() => void tick(), EVERY);
}
