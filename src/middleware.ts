import { NextResponse, type NextRequest } from "next/server";
import { LIMITS, clientIp, hit } from "./lib/ratelimit";

/**
 * 全站的寫入請求底線限制。個別路由另外有自己更嚴格的限制（見 lib/ratelimit.ts），
 * 這裡只是擋住明顯的洗版，避免沒有個別設定的端點完全沒人看守。
 * 金流回呼（pay/notify）不限制，那是金流商打進來的。
 */
export function middleware(req: NextRequest) {
  const m = req.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/pay/notify")) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/line/webhook")) return NextResponse.next();

  const r = hit(`edge:${clientIp(req.headers)}`, LIMITS.write);
  if (r.ok) return NextResponse.next();
  return NextResponse.json(
    { error: "too_many_requests", message: "動作太頻繁，請稍後再試。" },
    { status: 429, headers: { "retry-after": String(r.retryAfter) } },
  );
}

export const config = { matcher: ["/api/:path*"] };
