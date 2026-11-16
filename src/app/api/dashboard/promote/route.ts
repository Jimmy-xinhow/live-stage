import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { buyPromotion, MarketError, PROMO, type PromoSlot } from "@/lib/market";

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { slot?: string; days?: number };
  if (!b.slot || !(b.slot in PROMO)) return NextResponse.json({ error: "版位不正確" }, { status: 400 });
  try {
    await buyPromotion(auth.performer, b.slot as PromoSlot, Number(b.days));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MarketError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
