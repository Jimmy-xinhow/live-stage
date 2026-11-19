import { NextResponse } from "next/server";
import { ensureFanId } from "@/lib/fans";
import { z } from "zod";
import { getFanId } from "@/lib/session";
import { MarketError, reviewInquiry } from "@/lib/market";
import { LIMITS, guard } from "@/lib/ratelimit";
import { featureGate } from "@/lib/features";

const Body = z.object({ inquiryId: z.string().uuid(), slug: z.string().max(40), rating: z.number().int().min(1).max(5), review: z.string().max(300).default("") });

export async function POST(req: Request) {
  const off = featureGate("matching");
  if (off) return off;
  const rl = guard(req, "review", LIMITS.submit);
  if (rl) return rl;
  // 不需要登入：沒有身分就當場發一個，使用者完全不會被擋下來
  const fanId = await ensureFanId();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  try {
    await reviewInquiry(fanId, parsed.data.inquiryId, parsed.data.slug, parsed.data.rating, parsed.data.review);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MarketError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
