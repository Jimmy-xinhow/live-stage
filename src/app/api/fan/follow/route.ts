import { NextResponse } from "next/server";
import { getFanId } from "@/lib/session";
import { getPerformerBySlug } from "@/lib/orders";
import { setFollow, ensureFanId } from "@/lib/fans";
import { LIMITS, guard } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const rl = guard(req, "follow", LIMITS.write);
  if (rl) return rl;
  // 不需要登入：沒有身分就當場發一個，使用者完全不會被擋下來
  const fanId = await ensureFanId();
  const { slug, follow } = (await req.json()) as { slug: string; follow: boolean };
  const p = await getPerformerBySlug(slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setFollow(p.id, fanId, !!follow);
  return NextResponse.json({ ok: true, following: !!follow });
}
