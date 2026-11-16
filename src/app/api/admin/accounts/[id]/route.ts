import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { isAdmin } from "@/lib/session";
import { applyPoints } from "@/lib/billing";

const Body = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  adjustPoints: z.number().int().min(-100000).max(100000).optional(),
  note: z.string().max(120).default(""),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const { id } = await params;
  const db = await getDb();
  if (parsed.data.status) await db.update(performers).set({ status: parsed.data.status }).where(eq(performers.id, id));
  if (parsed.data.adjustPoints) await applyPoints(db, id, parsed.data.adjustPoints * 100, "adjust", { note: parsed.data.note || "平台調整" });
  return NextResponse.json({ ok: true });
}
