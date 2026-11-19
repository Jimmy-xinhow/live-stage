/**
 * 頻率限制。固定視窗計數。
 *
 * 兩層：
 * - 高頻動作（點按、輪詢、留言）走記憶體，便宜，而且就算多開一台各算各的，
 *   後果也只是現場多幾次點按。
 * - 跟帳號安全有關的（登入、註冊、重設密碼）走資料庫，跨實例共用也不怕重新部署——
 *   記憶體版本在這裡等於「重新部署一次就送你十次猜密碼的機會」。
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
  /**
   * middleware 的全站底線。放得比個別路由寬很多：
   * 同一個場地的觀眾常常共用電信業者的 NAT IP，太嚴會誤傷。
   * 真正的保護在個別路由的限制。
   */
  edge: { limit: 300, windowMs: 60_000 },
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

/* ────────────── 跨實例的版本：給帳號安全相關的動作 ────────────── */

/**
 * 記一次，狀態存在資料庫。比記憶體版本慢（一次 upsert），
 * 所以只用在每分鐘不會超過幾十次的端點上。
 *
 * 資料庫掛掉時放行，不要因為計數器壞掉就讓所有人登不進來——
 * 那是把一個可用性問題變成兩個。
 */
export async function hitShared(key: string, { limit, windowMs }: Limit): Promise<HitResult> {
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const resetAt = (window + 1) * windowMs;
  try {
    const { getDb } = await import("./db");
    const { rateHits } = await import("./db/schema");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    const [row] = await db
      .insert(rateHits)
      .values({ key: key.slice(0, 160), window, n: 1, expiresAt: new Date(resetAt) })
      .onConflictDoUpdate({ target: [rateHits.key, rateHits.window], set: { n: sql`${rateHits.n} + 1` } })
      .returning({ n: rateHits.n });
    const n = row?.n ?? 1;
    if (n > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((resetAt - now) / 1000) };
    return { ok: true, remaining: limit - n, retryAfter: 0 };
  } catch {
    return { ok: true, remaining: limit, retryAfter: 0 };
  }
}

/** guard 的資料庫版本。登入、註冊、重設密碼、團員認領用這個 */
export async function guardShared(req: Request, scope: string, limit: Limit, extraKey = ""): Promise<Response | null> {
  const r = await hitShared(`${scope}:${clientIp(req.headers)}:${extraKey}`, limit);
  if (r.ok) return null;
  return new Response(JSON.stringify({ error: "too_many_requests", message: "嘗試太多次了，請稍後再試。" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(r.retryAfter) },
  });
}
