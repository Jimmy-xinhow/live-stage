import { NextResponse } from "next/server";
import { z } from "zod";
import { joinBand } from "@/lib/band";
import { createMemberSession, getMemberIds } from "@/lib/session";
import { LIMITS, guardShared } from "@/lib/ratelimit";

const Body = z.object({ code: z.string().trim().min(4).max(12) });

/**
 * 團員認領。不需要登入——拿到連結的人就是團長發給的人。
 * 認領成功後把團員 id 寫進這台裝置的簽章 cookie。
 */
export async function POST(req: Request) {
  const rl = await guardShared(req, "bandjoin", LIMITS.auth);
  if (rl) return rl;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "邀請碼格式不對" }, { status: 400 });

  const mine = await getMemberIds();
  const r = await joinBand(parsed.data.code, mine);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  if (!mine.includes(r.memberId)) await createMemberSession([...mine, r.memberId].slice(-12));
  return NextResponse.json({ ok: true, name: r.name });
}
