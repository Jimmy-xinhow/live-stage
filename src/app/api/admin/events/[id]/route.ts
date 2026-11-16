import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { isAdmin } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (status !== "published" && status !== "cancelled") return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  await db.update(events).set({ status }).where(eq(events.id, (await params).id));
  return NextResponse.json({ ok: true });
}
