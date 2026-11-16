import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { achievements } from "@/lib/db/schema";
import { ACHIEVEMENT_TEMPLATES, backfillAchievement } from "@/lib/rewards";

const Item = z.object({
  name: z.string().trim().min(1).max(20),
  emoji: z.string().trim().min(1).max(8).default("🏅"),
  kind: z.enum(["total", "count"]),
  threshold: z.number().int().min(1).max(10_000_000),
  reward: z.string().trim().max(100).nullish(),
  stock: z.number().int().min(1).max(100000).nullish(),
});

/** 新增成就；{ templates: true } 一次套用預設範本 */
export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const items = body?.templates ? ACHIEVEMENT_TEMPLATES : [body];
  const parsed = z.array(Item).max(10).safeParse(items);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "格式錯誤" }, { status: 400 });
  const db = await getDb();
  const rows = await db
    .insert(achievements)
    .values(parsed.data.map((a) => ({ ...a, reward: a.reward || null, stock: a.stock ?? null, performerId: auth.performer.id })))
    .returning();
  let backfilled = 0;
  for (const a of rows) backfilled += await backfillAchievement(a);
  return NextResponse.json({ ok: true, added: rows.length, backfilled });
}
