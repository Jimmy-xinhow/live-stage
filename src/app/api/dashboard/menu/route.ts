import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { requirePerformer } from "@/lib/auth";

const Item = z.object({
  title: z.string().trim().min(1).max(60),
  subtitle: z.string().trim().max(60).default(""),
  category: z.string().trim().max(20).default(""),
  price: z.number().int().min(1).max(50000),
});
const Body = z.object({ items: z.array(Item).min(1).max(500) });

/** 新增（含批次匯入）歌單項目 */
export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "格式錯誤" }, { status: 400 });
  const db = await getDb();
  const [{ m }] = await db.select({ m: sql<number>`coalesce(max(${menuItems.sort}),0)::int` }).from(menuItems).where(eq(menuItems.performerId, auth.performer.id));
  await db.insert(menuItems).values(parsed.data.items.map((it, i) => ({ ...it, performerId: auth.performer.id, sort: Number(m) + i + 1 })));
  return NextResponse.json({ ok: true, added: parsed.data.items.length });
}
