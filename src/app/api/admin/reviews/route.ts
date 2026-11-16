import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inquiryTargets } from "@/lib/db/schema";
import { isAdmin } from "@/lib/session";

/** 隱藏或恢復一則邀約評價 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { inquiryId?: string; performerId?: string; hidden?: boolean };
  if (!b.inquiryId || !b.performerId) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  await db.update(inquiryTargets).set({ reviewHidden: !!b.hidden }).where(and(eq(inquiryTargets.inquiryId, b.inquiryId), eq(inquiryTargets.performerId, b.performerId)));
  return NextResponse.json({ ok: true });
}
