import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganizer } from "@/lib/auth";
import { createEvent, EventError } from "@/lib/events";
import { featureGate } from "@/lib/features";
import { EventBody as Body } from "@/lib/schemas/event";


export async function POST(req: Request) {
  const off = featureGate("events");
  if (off) return off;
  const auth = await requireOrganizer();
  if (!auth) return NextResponse.json({ error: "請用店家／主辦帳號登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "請把必填欄位填完整" }, { status: 400 });
  try {
    const ev = await createEvent(auth.performer, parsed.data);
    return NextResponse.json({ id: ev.id });
  } catch (e) {
    if (e instanceof EventError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
