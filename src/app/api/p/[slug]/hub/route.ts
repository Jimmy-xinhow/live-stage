import { NextResponse } from "next/server";
import { getPerformerBySlug } from "@/lib/orders";
import { getFanId } from "@/lib/session";
import { addWish, checkIn, cheer, HubError, hubState, joinLottery, raiseHand, voteWish } from "@/lib/hub";
import { LIMITS, guard } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await hubState(p, await getFanId()));
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rl = guard(req, "hub", LIMITS.interact);
  if (rl) return rl;
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; n?: number; kind?: string; text?: string; title?: string; id?: string; on?: boolean };
  const fanId = await getFanId();
  try {
    if (b.action === "cheer") await cheer(p, Number(b.n) || 1);
    else {
      if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入" }, { status: 401 });
      if (b.action === "checkin") await checkIn(p, fanId);
      else if (b.action === "join") await joinLottery(p, fanId);
      else if (b.action === "hand") await raiseHand(p, fanId, String(b.kind), String(b.text ?? ""));
      else if (b.action === "wish") await addWish(p, fanId, String(b.title ?? ""));
      else if (b.action === "vote") await voteWish(p, fanId, String(b.id), b.on !== false);
      else return NextResponse.json({ error: "未知的動作" }, { status: 400 });
    }
    return NextResponse.json(await hubState((await getPerformerBySlug(p.slug))!, fanId));
  } catch (e) {
    if (e instanceof HubError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
