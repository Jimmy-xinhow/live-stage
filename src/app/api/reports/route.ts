import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { getFanId } from "@/lib/session";
import { LIMITS, clientIp, guard } from "@/lib/ratelimit";

const Body = z.object({
  targetType: z.enum(["order", "performer", "event", "chat"]),
  targetId: z.string().uuid(),
  reason: z.enum(["spam", "abuse", "sexual", "fake", "other"]),
  note: z.string().trim().max(200).default(""),
});

/** 檢舉不當內容。不需要登入也能檢舉，但同一個來源有頻率限制 */
export async function POST(req: Request) {
  const rl = guard(req, "report", LIMITS.submit);
  if (rl) return rl;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const b = parsed.data;
  const db = await getDb();
  const ip = clientIp(req.headers).slice(0, 45);

  // 同一個來源對同一個對象，一天內只記一次，避免洗版
  const dup = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.targetType, b.targetType), eq(reports.targetId, b.targetId), eq(reports.ip, ip), gte(reports.createdAt, new Date(Date.now() - 86400_000))))
    .limit(1);
  if (dup.length) return NextResponse.json({ ok: true, already: true });

  await db.insert(reports).values({
    targetType: b.targetType,
    targetId: b.targetId,
    fanId: (await getFanId()) ?? null,
    reason: b.reason,
    note: b.note,
    ip,
  });
  return NextResponse.json({ ok: true });
}
