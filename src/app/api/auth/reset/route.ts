import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, resetPassword } from "@/lib/auth";
import { LIMITS } from "@/lib/ratelimit";
import { guardShared } from "@/lib/ratelimit.server";

const Body = z.object({ token: z.string().max(200), password: z.string().max(200) });

export async function POST(req: Request) {
  const rl = await guardShared(req, "reset", LIMITS.auth);
  if (rl) return rl;
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: "資料不完整" }, { status: 400 });
  try {
    await resetPassword(b.data.token, b.data.password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
