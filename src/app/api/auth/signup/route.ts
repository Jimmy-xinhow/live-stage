import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, signUp } from "@/lib/auth";
import { LIMITS, guard } from "@/lib/ratelimit";

const Body = z.object({
  email: z.string().trim().max(160),
  password: z.string().max(200),
  displayName: z.string().trim().max(40),
});

export async function POST(req: Request) {
  const rl = guard(req, "signup", LIMITS.auth);
  if (rl) return rl;
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: "資料不完整" }, { status: 400 });
  try {
    const p = await signUp(b.data);
    return NextResponse.json({ ok: true, slug: p.slug });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
