import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { achievements } from "@/lib/db/schema";

const Patch = z.object({
  name: z.string().trim().min(1).max(20).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  reward: z.string().trim().max(100).nullable().optional(),
  stock: z.number().int().min(1).max(100000).nullable().optional(),
  active: z.boolean().optional(),
});

async function scope(params: Promise<{ id: string }>) {
  const auth = await requirePerformer();
  return auth ? and(eq(achievements.id, (await params).id), eq(achievements.performerId, auth.performer.id)) : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const where = await scope(params);
  if (!where) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  await db.update(achievements).set({ ...parsed.data, ...(parsed.data.reward === "" ? { reward: null } : {}) }).where(where);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const where = await scope(params);
  if (!where) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const db = await getDb();
  await db.delete(achievements).where(where);
  return NextResponse.json({ ok: true });
}
