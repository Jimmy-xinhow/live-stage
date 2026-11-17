/**
 * 頻率限制。固定視窗計數，狀態存在記憶體裡。
 *
 * 限制：狀態不跨程序共用，所以水平擴充成多台之後，每台各算各的。
 * 現在是單一實例，這樣就夠；要擴充時把 hit() 換成 Redis 或 Postgres 的實作即可，
 * 呼叫端的介面不用動。
 */

type Bucket = { n: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** 定期清掉過期的桶子，避免記憶體一直長大 */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export type Limit = { limit: number; windowMs: number };

/** 常用的限制值，集中在這裡方便調整 */
export const LIMITS = {
  /** 下單、付款：現場同一個人不會這麼快連點 */
  order: { limit: 12, windowMs: 60_000 },
  /** 留言、聊天室 */
  chat: { limit: 20, windowMs: 60_000 },
  /** 互動、遊戲（應援會連點，放寬一點） */
  interact: { limit: 60, windowMs: 60_000 },
  /** 送出邀約、評價：成本高，限制嚴格 */
  submit: { limit: 6, windowMs: 300_000 },
  /** 登入、驗證相關 */
  auth: { limit: 10, windowMs: 300_000 },
  /** 其他寫入動作的預設值 */
  write: { limit: 60, windowMs: 60_000 },
  /** 讀取類的輪詢端點（狀態、排行） */
  poll: { limit: 240, windowMs: 60_000 },
} satisfies Record<string, Limit>;

export type HitResult = { ok: boolean; remaining: number; retryAfter: number };

/** 記一次，回傳是否還在額度內 */
export function hit(key: string, { limit, windowMs }: Limit): HitResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { n: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  b.n += 1;
  if (b.n > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, remaining: limit - b.n, retryAfter: 0 };
}

/** 從請求標頭取得來源 IP。Railway 會帶 x-forwarded-for */
export function clientIp(h: Headers) {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * 路由裡用的守門員。超過額度回傳 429 的 Response，沒超過回傳 null。
 * scope 用來分開不同用途的額度（例如同一個 IP 的下單和留言分開算）。
 */
export function guard(req: Request, scope: string, limit: Limit, extraKey = ""): Response | null {
  const key = `${scope}:${clientIp(req.headers)}:${extraKey}`;
  const r = hit(key, limit);
  if (r.ok) return null;
  return new Response(JSON.stringify({ error: "too_many_requests", message: "動作太頻繁，請稍後再試。" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(r.retryAfter) },
  });
}
