import { NextResponse } from "next/server";
import { bumpClick } from "@/lib/market";
import { LIMITS, guard } from "@/lib/ratelimit";
import { featureGate } from "@/lib/features";

/** 版位點擊：前台用 sendBeacon 回報，不回傳內容 */
export async function POST(req: Request) {
  const off = featureGate("promote");
  if (off) return off;
  const rl = guard(req, "promo", LIMITS.poll);
  if (rl) return rl;
  const id = (await req.text()).trim();
  if (/^[0-9a-f-]{36}$/.test(id)) await bumpClick(id);
  return new NextResponse(null, { status: 204 });
}
