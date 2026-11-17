import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { adminActor, isAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";

const Body = z.object({ id: z.string().uuid(), status: z.enum(["reviewed", "dismissed"]) });

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  const [r] = await db
    .update(reports)
    .set({ status: parsed.data.status, handledAt: new Date() })
    .where(eq(reports.id, parsed.data.id))
    .returning();
  if (!r) return NextResponse.json({ error: "找不到這筆檢舉" }, { status: 404 });
  await audit({
    actor: await adminActor(), req, action: "handle_report",
    targetType: "report", targetId: r.id, targetName: `${r.targetType} ${r.reason}`,
    detail: parsed.data.status === "reviewed" ? "已處理" : "不成立",
  });
  return NextResponse.json({ ok: true });
}
