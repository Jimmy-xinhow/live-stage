import { NextResponse } from "next/server";
import { z } from "zod";
import { reportError } from "@/lib/errors";
import { LIMITS, guard } from "@/lib/ratelimit";

const Body = z.object({ message: z.string().max(300), digest: z.string().max(40).optional(), path: z.string().max(200).optional() });

/** 前端畫面壞掉時回報，只記錄不做其他事 */
export async function POST(req: Request) {
  const rl = guard(req, "clienterr", LIMITS.submit);
  if (rl) return rl;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });
  reportError("client", new Error(parsed.data.message), { digest: parsed.data.digest ?? "", path: parsed.data.path ?? "" });
  return NextResponse.json({ ok: true });
}
