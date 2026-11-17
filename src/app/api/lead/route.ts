import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { LIMITS, clientIp, guard } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().email().max(120), kind: z.enum(["street", "venue", "streamer"]) });

/** 跟進名單：還沒註冊但有興趣的人 */
export async function POST(req: Request) {
  const rl = guard(req, "lead", LIMITS.submit);
  if (rl) return rl;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const db = await getDb();
  const email = parsed.data.email.toLowerCase();
  const dup = await db.select({ id: leads.id }).from(leads).where(and(eq(leads.email, email))).limit(1);
  if (!dup.length) {
    await db.insert(leads).values({ email, kind: parsed.data.kind, ip: clientIp(req.headers).slice(0, 45) });
  }
  return NextResponse.json({ ok: true });
}
