import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { MarketError, replyInquiry } from "@/lib/market";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { decline?: boolean; amount?: number; note?: string };
  if (!b.decline && b.amount != null && (!Number.isInteger(b.amount) || b.amount < 0 || b.amount > 10_000_000)) return NextResponse.json({ error: "金額不正確" }, { status: 400 });
  try {
    await replyInquiry(auth.performer, (await params).id, b);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MarketError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
