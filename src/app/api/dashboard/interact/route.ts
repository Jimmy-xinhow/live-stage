import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { consoleState, drawLottery, HubError, pickHand, resetHype, setWishStatus, startLottery } from "@/lib/hub";
import { currentGame, endGame, GameError, publicGame, quizControl, startGame, wheelReview, wheelSpin, type GameType } from "@/lib/games";
import type { QuizQuestion } from "@/lib/db/schema";
import { planHasGames, planHasPro } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

async function state(performerId: string) {
  const auth = await requirePerformer();
  const p = auth!.performer;
  return { hub: await consoleState(p), game: publicGame(await currentGame(performerId), null, performerId) };
}

export async function GET() {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  return NextResponse.json(await state(auth.performer.id));
}

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const p = auth.performer;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    let winner: string | undefined;
    if (b.action === "lottery_start") await startLottery(p, String(b.prize ?? ""), Number(b.minutes) || 3);
    else if (b.action === "lottery_draw") winner = await drawLottery(p);
    else if (b.action === "pick") await pickHand(p, String(b.id));
    else if (b.action === "hype_reset") await resetHype(p);
    else if (b.action === "wish") await setWishStatus(p, String(b.id), b.status as "open" | "practice" | "done", String(b.note ?? ""));
    else if (b.action === "game_start") {
      const plan = effectivePlan(p);
      if (!planHasGames(plan)) return NextResponse.json({ error: "互動遊戲要互動方案以上才能開。想先試用跟我們說一聲，第一場免費開著。" }, { status: 402 });
      // 跨表演者 PK 是全部方案才有的
      if (b.type === "pk" && !planHasPro(plan)) return NextResponse.json({ error: "跨表演者 PK 要全部方案。在後台的「方案」頁可以升級。" }, { status: 402 });
      await startGame(p, b.type as GameType, { lanes: (b.lanes as string[]) ?? [], reward: String(b.reward ?? ""), minutes: Number(b.minutes) || 3, goal: Number(b.goal) || undefined, questions: b.questions as QuizQuestion[] | undefined, opponentSlug: b.opponentSlug as string | undefined });
    }
    else if (b.action === "quiz") { const g = await currentGame(p.id); if (g) await quizControl(g.id, b.mode as "open" | "reveal" | "next", Number(b.secs) || 15); }
    else if (b.action === "wheel_review") { const g = await currentGame(p.id); if (g) await wheelReview(g.id, String(b.id), !!b.approve); }
    else if (b.action === "wheel_spin") { const g = await currentGame(p.id); if (g) await wheelSpin(g.id); }
    else if (b.action === "game_end") await endGame(p);
    else return NextResponse.json({ error: "未知的動作" }, { status: 400 });
    return NextResponse.json({ ...(await state(p.id)), winner });
  } catch (e) {
    if (e instanceof HubError || e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
