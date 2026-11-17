import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { adminActor, isAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
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
  const [target] = await db.select({ name: performers.displayName }).from(performers).where(eq(performers.id, id));
  if (!target) return NextResponse.json({ error: "找不到這個帳號" }, { status: 404 });
  const actor = await adminActor();
  if (parsed.data.status) {
    await db.update(performers).set({ status: parsed.data.status }).where(eq(performers.id, id));
    await audit({
      actor, req,
      action: parsed.data.status === "suspended" ? "suspend" : "activate",
      targetType: "performer", targetId: id, targetName: target.name, detail: parsed.data.note,
    });
  }
  if (parsed.data.adjustPoints) {
    await applyPoints(db, id, parsed.data.adjustPoints * 100, "adjust", { note: parsed.data.note || "平台調整" });
    await audit({
      actor, req, action: "adjust_points",
      targetType: "performer", targetId: id, targetName: target.name,
      detail: `${parsed.data.adjustPoints > 0 ? "+" : ""}${parsed.data.adjustPoints} 點${parsed.data.note ? `・${parsed.data.note}` : ""}`,
    });
  }
  return NextResponse.json({ ok: true });
}
