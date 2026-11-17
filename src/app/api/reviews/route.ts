import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanId } from "@/lib/session";
import { MarketError, reviewInquiry } from "@/lib/market";
import { LIMITS, guard } from "@/lib/ratelimit";

const Body = z.object({ inquiryId: z.string().uuid(), slug: z.string().max(40), rating: z.number().int().min(1).max(5), review: z.string().max(300).default("") });

export async function POST(req: Request) {
  const rl = guard(req, "review", LIMITS.submit);
  if (rl) return rl;
  const fanId = await getFanId();
  if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入" }, { status: 401 });
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
