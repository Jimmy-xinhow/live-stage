import { NextResponse } from "next/server";
import { getFanId } from "@/lib/session";
import { getPerformerBySlug } from "@/lib/orders";
import { setFollow } from "@/lib/fans";
import { LIMITS, guard } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const rl = guard(req, "follow", LIMITS.write);
  if (rl) return rl;
  const fanId = await getFanId();
  if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入" }, { status: 401 });
  const { slug, follow } = (await req.json()) as { slug: string; follow: boolean };
  const p = await getPerformerBySlug(slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setFollow(p.id, fanId, !!follow);
  return NextResponse.json({ ok: true, following: !!follow });
}
