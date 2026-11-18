import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanId } from "@/lib/session";
import { getFan } from "@/lib/fans";
import { joinBand } from "@/lib/band";
import { LIMITS, guard } from "@/lib/ratelimit";

const Body = z.object({ code: z.string().trim().min(4).max(12) });

/** 團員用邀請碼把自己的 LINE 帳號綁到團裡 */
export async function POST(req: Request) {
  const rl = guard(req, "bandjoin", LIMITS.auth);
  if (rl) return rl;
  const fan = await getFan(await getFanId());
  if (!fan?.lineUserId) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "邀請碼格式不對" }, { status: 400 });
  const r = await joinBand(parsed.data.code, fan.lineUserId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, name: r.name });
}
