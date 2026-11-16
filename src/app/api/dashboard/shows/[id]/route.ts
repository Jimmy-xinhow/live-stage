import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { shows } from "@/lib/db/schema";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = await getDb();
  await db.delete(shows).where(and(eq(shows.id, (await params).id), eq(shows.performerId, auth.performer.id)));
  return NextResponse.json({ ok: true });
}
