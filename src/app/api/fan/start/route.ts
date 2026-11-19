import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { fans } from "@/lib/db/schema";
import { createFanSession, getFanId } from "@/lib/session";
import { LIMITS, guard } from "@/lib/ratelimit";
import { eq } from "drizzle-orm";

const Body = z.object({ name: z.string().trim().max(40).optional() });

/**
 * 給這台裝置一個觀眾身分。沒有登入、沒有密碼、不問任何個人資料。
 *
 * 已經有身分就原樣回傳，所以重複呼叫是安全的——弱網重送也不會長出第二個人。
 */
export async function POST(req: Request) {
  const rl = guard(req, "fanstart", LIMITS.auth);
  if (rl) return rl;

  const db = await getDb();
  const existing = await getFanId();
  if (existing) {
    const [f] = await db.select().from(fans).where(eq(fans.id, existing));
    if (f) {
      await db.update(fans).set({ lastSeenAt: new Date() }).where(eq(fans.id, f.id));
      return NextResponse.json({ fan: { name: f.name, avatar: f.avatarUrl } });
    }
  }

  const b = Body.safeParse(await req.json().catch(() => ({})));
  const [fan] = await db.insert(fans).values({ name: b.success ? (b.data.name ?? "") : "" }).returning();
  await createFanSession(fan.id);
  return NextResponse.json({ fan: { name: fan.name, avatar: fan.avatarUrl } });
}
