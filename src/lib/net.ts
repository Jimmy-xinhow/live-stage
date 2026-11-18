"use client";

/**
 * 弱網連線層。
 *
 * 街頭演出最常見的失敗不是程式錯，是 4G 突然斷一下。
 * 原本的寫法是一次 fetch，失敗就顯示「發生錯誤」，觀眾只能自己再按一次——
 * 而他不知道剛才那次到底有沒有送出去。
 *
 * 這裡處理三件事：
 * 1. 逾時：請求卡住不會無限等，到時間就中止再重試。
 * 2. 重試：網路錯誤、5xx、429 自動退避重試，中間有隨機抖動避免同時湧入。
 * 3. 離線：瀏覽器說自己離線時先等網路回來，不浪費一次重試。
 *
 * POST 只有在帶著冪等鍵時才重試。沒有鑰匙的重送可能變成第二筆訂單，
 * 那比失敗更糟。
 */

export type NetOpts = {
  /** 單次請求的逾時（毫秒） */
  timeout?: number;
  /** 最多重試幾次（不含第一次） */
  retries?: number;
  /** 帶了這個才會重試非 GET 的請求 */
  idempotent?: boolean;
  /** 每次失敗時回報，給介面顯示「連線不穩，重試中」 */
  onRetry?: (attempt: number, waitMs: number) => void;
  signal?: AbortSignal;
};

export class NetError extends Error {
  constructor(message: string, readonly kind: "offline" | "timeout" | "network" | "server" | "aborted", readonly status = 0) {
    super(message);
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); rej(new NetError("已取消", "aborted")); }, { once: true });
  });

/** 等網路回來，最多等 waitMs。瀏覽器不支援就直接過 */
function waitOnline(waitMs: number, signal?: AbortSignal) {
  if (typeof navigator === "undefined" || navigator.onLine !== false) return Promise.resolve();
  return new Promise<void>((res) => {
    const done = () => { clearTimeout(t); window.removeEventListener("online", done); res(); };
    const t = setTimeout(done, waitMs);
    window.addEventListener("online", done, { once: true });
    signal?.addEventListener("abort", done, { once: true });
  });
}

/** 退避：0.6s、1.4s、3s、6s，各加上最多 400ms 的抖動 */
const backoff = (attempt: number) => Math.min(6000, 600 * 2 ** attempt) + Math.random() * 400;

export async function request(url: string, init: RequestInit = {}, opts: NetOpts = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD" || opts.idempotent === true;
  const retries = opts.retries ?? (canRetry ? 3 : 0);
  const timeout = opts.timeout ?? 12_000;

  let lastError: NetError = new NetError("連線失敗", "network");

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) throw new NetError("已取消", "aborted");
    await waitOnline(8000, opts.signal);

    const ac = new AbortController();
    const onOuterAbort = () => ac.abort();
    opts.signal?.addEventListener("abort", onOuterAbort, { once: true });
    const timer = setTimeout(() => ac.abort(), timeout);

    try {
      const res = await fetch(url, { ...init, signal: ac.signal });
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuterAbort);

      // 4xx 是請求本身的問題，重試也一樣，直接把回應交出去讓呼叫端讀錯誤訊息。
      // 429 例外：那是太快了，等一下有機會成功。
      if (res.status < 500 && res.status !== 429) return res;
      if (attempt === retries) return res;
      lastError = new NetError(`伺服器忙碌（${res.status}）`, "server", res.status);
    } catch (e) {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onOuterAbort);
      if (opts.signal?.aborted) throw new NetError("已取消", "aborted");
      lastError = ac.signal.aborted
        ? new NetError("等太久了，網路好像不太穩", "timeout")
        : new NetError(typeof navigator !== "undefined" && navigator.onLine === false ? "現在沒有網路" : "連線失敗", typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network");
      if (attempt === retries) throw lastError;
    }

    const wait = backoff(attempt);
    opts.onRetry?.(attempt + 1, wait);
    await sleep(wait, opts.signal);
  }

  throw lastError;
}

/** 送 JSON 並解析回應。非 2xx 會把伺服器的 error 訊息丟成 Error */
export async function postJson<T = unknown>(url: string, body: unknown, opts: NetOpts = {}): Promise<T> {
  const res = await request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, opts);
  const j = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(j.error ?? `送出失敗（${res.status}）`);
  return j;
}

/** 拿 JSON，失敗回 null。給輪詢用：壞一次不該讓畫面爆掉 */
export async function getJson<T = unknown>(url: string, opts: NetOpts = {}): Promise<T | null> {
  try {
    const res = await request(url, { cache: "no-store" }, { retries: 2, timeout: 8000, ...opts });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 一把這一次送出用的鑰匙。重試要用同一把，換新的就會變成第二筆 */
export const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4000-8000-${Math.random().toString(16).slice(2, 14)}`;
