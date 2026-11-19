import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, signIn } from "@/lib/auth";
import { LIMITS, guardShared } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().trim().max(160), password: z.string().max(200) });

export async function POST(req: Request) {
  // 登入是猜密碼的入口，額度要比一般 API 嚴
  const rl = await guardShared(req, "signin", LIMITS.auth);
  if (rl) return rl;
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: "資料不完整" }, { status: 400 });
  try {
    const p = await signIn(b.data.email, b.data.password);
    return NextResponse.json({ ok: true, home: p.accountType === "organizer" ? "/" : "/dashboard" });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }
}
