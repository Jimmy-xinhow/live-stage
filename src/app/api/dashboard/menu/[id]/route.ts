import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requirePerformer } from "@/lib/auth";

const Patch = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  subtitle: z.string().trim().max(60).optional(),
  category: z.string().trim().max(20).optional(),
  price: z.number().int().min(1).max(50000).optional(),
  enabled: z.boolean().optional(),
});

async function scope(params: Promise<{ id: string }>) {
  const auth = await requirePerformer();
  if (!auth) return null;
  return and(eq(menuItems.id, (await params).id), eq(menuItems.performerId, auth.performer.id));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const where = await scope(params);
  if (!where) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  await db.update(menuItems).set(parsed.data).where(where);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const where = await scope(params);
  if (!where) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = await getDb();
  await db.delete(menuItems).where(where);
  return NextResponse.json({ ok: true });
}
