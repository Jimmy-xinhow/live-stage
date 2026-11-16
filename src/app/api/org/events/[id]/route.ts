import { NextResponse } from "next/server";
import { requireOrganizer } from "@/lib/auth";
import { cancelEvent, EventError, updateEvent } from "@/lib/events";
import { Body } from "../route";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganizer();
  if (!auth) return NextResponse.json({ error: "請用店家／主辦帳號登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "請把必填欄位填完整" }, { status: 400 });
  try {
    await updateEvent(auth.performer, (await params).id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EventError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganizer();
  if (!auth) return NextResponse.json({ error: "請用店家／主辦帳號登入" }, { status: 401 });
  try {
    await cancelEvent(auth.performer, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EventError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
