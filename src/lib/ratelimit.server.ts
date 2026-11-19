import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { rateHits } from "./db/schema";
import { clientIp, type HitResult, type Limit } from "./ratelimit";

/**
 * 跨實例的頻率限制。
 *
 * 和 lib/ratelimit 分成兩個檔案，是因為 middleware 跑在 edge 執行環境，
 * 那裡沒有資料庫驅動。middleware 只會 import 記憶體那一份；
 * 需要資料庫的這一份只在 Node 的路由處理器裡用。
 */
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
