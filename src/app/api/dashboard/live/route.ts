import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { endLive, goLive } from "@/lib/orders";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { kindBySlug } from "@/lib/kinds";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), location: z.string().max(60).default(""), mode: z.enum(["onsite", "outdoor", "indoor"]).default("onsite") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("queue"), queueOpen: z.boolean() }),
]);

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const b = parsed.data;
  if (b.action === "start") {
    // 模式必須是這個型態允許的，避免街頭帳號開出室內直播的對戰
    const k = kindBySlug(auth.performer.kind);
    const mode = k.modes.includes(b.mode) ? b.mode : k.defaultMode;
    return NextResponse.json(await goLive(auth.performer, b.location, mode));
  }
  if (b.action === "end") {
    await endLive(auth.performer);
    return NextResponse.json({ ok: true });
  }
  const db = await getDb();
  await db.update(performers).set({ queueOpen: b.queueOpen }).where(eq(performers.id, auth.performer.id));
  return NextResponse.json({ ok: true });
}
