import { NextResponse } from "next/server";
import { getPerformerBySlug } from "@/lib/orders";
import { getFanId } from "@/lib/session";
import { getFan } from "@/lib/fans";
import { currentGame, GameError, publicGame, quizAnswer, tap, wheelSubmit } from "@/lib/games";
import { LIMITS, guard } from "@/lib/ratelimit";
import { battleGamesOn, featureGate } from "@/lib/features";
import { sessionMode } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const off = featureGate("games");
  if (off) return off;
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!battleGamesOn(await sessionMode(p.liveSessionId))) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ game: publicGame(await currentGame(p.id), await getFanId(), p.id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const off = featureGate("games");
  if (off) return off;
  const rl = guard(req, "game", LIMITS.interact);
  if (rl) return rl;
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!battleGamesOn(await sessionMode(p.liveSessionId))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const fanId = await getFanId();
  if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; lane?: number; count?: number; pick?: number; text?: string; name?: string };
  const g = await currentGame(p.id);
  if (!g || g.status !== "running") return NextResponse.json({ game: publicGame(g, fanId, p.id) });
  const fan = await getFan(fanId);
  try {
    if (b.action === "answer") await quizAnswer(g.id, fanId, fan?.name ?? "觀眾", Number(b.pick));
    else if (b.action === "wish") await wheelSubmit(g.id, fanId, fan?.name ?? "觀眾", String(b.text ?? ""));
    else await tap(g.id, fanId, g.opponentId ? (g.performerId === p.id ? 0 : 1) : Number(b.lane) || 0, Number(b.count) || 1);
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
  return NextResponse.json({ game: publicGame(await currentGame(p.id), fanId, p.id) });
}
