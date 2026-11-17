import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { applyKind } from "@/lib/onboard";
import { LIMITS, guard } from "@/lib/ratelimit";

const Body = z.object({ kind: z.enum(["street", "venue", "streamer"]), name: z.string().trim().min(1).max(40).optional() });

export async function POST(req: Request) {
  const rl = guard(req, "kind", LIMITS.write);
  if (rl) return rl;
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  if (parsed.data.name) {
    const { getDb } = await import("@/lib/db");
    const { performers } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    await db.update(performers).set({ displayName: parsed.data.name }).where(eq(performers.id, auth.performer.id));
  }
  const p = await applyKind(auth.performer.id, parsed.data.kind);
  if (!p) return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
