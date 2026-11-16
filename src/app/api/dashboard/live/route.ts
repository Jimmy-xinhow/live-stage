import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { endLive, goLive } from "@/lib/orders";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), location: z.string().max(60).default(""), notifyFans: z.boolean().default(true) }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("queue"), queueOpen: z.boolean() }),
]);

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const b = parsed.data;
  if (b.action === "start") return NextResponse.json(await goLive(auth.performer, b.location, b.notifyFans));
  if (b.action === "end") {
    await endLive(auth.performer);
    return NextResponse.json({ ok: true });
  }
  const db = await getDb();
  await db.update(performers).set({ queueOpen: b.queueOpen }).where(eq(performers.id, auth.performer.id));
  return NextResponse.json({ ok: true });
}
