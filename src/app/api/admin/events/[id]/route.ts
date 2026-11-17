import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { adminActor, isAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { featureGate } from "@/lib/features";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const off = featureGate("events");
  if (off) return off;
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (status !== "published" && status !== "cancelled") return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  const id = (await params).id;
  const [ev] = await db.update(events).set({ status }).where(eq(events.id, id)).returning({ title: events.title });
  if (!ev) return NextResponse.json({ error: "找不到這場活動" }, { status: 404 });
  await audit({
    actor: await adminActor(), req,
    action: status === "published" ? "publish_event" : "unpublish_event",
    targetType: "event", targetId: id, targetName: ev.title,
  });
  return NextResponse.json({ ok: true });
}
