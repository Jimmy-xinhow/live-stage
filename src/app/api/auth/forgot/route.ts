import { NextResponse } from "next/server";
import { z } from "zod";
import { requestReset } from "@/lib/auth";
import { LIMITS, guardShared } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().trim().max(160) });

export async function POST(req: Request) {
  const rl = await guardShared(req, "forgot", LIMITS.auth);
  if (rl) return rl;
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: "資料不完整" }, { status: 400 });
  // 不管信箱存不存在都回成功，否則這裡就變成查詢「誰有註冊」的工具
  await requestReset(b.data.email);
  return NextResponse.json({ ok: true });
}
