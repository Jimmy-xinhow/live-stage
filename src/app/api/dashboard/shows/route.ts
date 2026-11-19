import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { createShow } from "@/lib/fans";

const Body = z.object({
  /** 台北時間 yyyy-MM-ddTHH:mm（datetime-local） */
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  location: z.string().trim().min(1).max(60),
  note: z.string().trim().max(120).default(""),
  notify: z.boolean().default(true),
});

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "格式錯誤" }, { status: 400 });
  const b = parsed.data;
  const startsAt = new Date(`${b.startsAt}:00+08:00`);
  if (startsAt.getTime() < Date.now()) return NextResponse.json({ error: "時間已經過了" }, { status: 400 });
  await createShow(auth.performer, { startsAt, location: b.location, note: b.note });
  return NextResponse.json({ ok: true });
}
