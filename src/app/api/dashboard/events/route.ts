import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { EventError, respondTag } from "@/lib/events";

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; accept?: boolean };
  if (!b.id) return NextResponse.json({ error: "參數不正確" }, { status: 400 });
  try {
    const r = await respondTag(auth.performer, b.id, !!b.accept);
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof EventError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
