import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/auth";
import { buyEventPromotion, EventError, type EventSlot } from "@/lib/events";

export async function POST(req: Request) {
  const auth = await requireOrganizer();
  if (!auth) return NextResponse.json({ error: "請用店家／主辦帳號登入" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { eventId?: string; slot?: EventSlot; days?: number };
  if (!b.eventId || (b.slot !== "event_top" && b.slot !== "event_home")) return NextResponse.json({ error: "參數不正確" }, { status: 400 });
  try {
    await buyEventPromotion(auth.performer, b.eventId, b.slot, Number(b.days) || 7);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EventError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
