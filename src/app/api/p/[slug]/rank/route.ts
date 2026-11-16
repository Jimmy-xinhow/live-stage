import { NextResponse } from "next/server";
import { getPerformerBySlug } from "@/lib/orders";
import { achievementsWithProgress, leaderboard, myPosition, type Period } from "@/lib/rewards";
import { getFanId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("period");
  const period: Period = q === "month" || q === "all" ? q : "session";
  const fanId = await getFanId();
  const [board, ach] = await Promise.all([leaderboard(p, period), achievementsWithProgress(p, fanId)]);
  const me = myPosition(board, fanId);
  return NextResponse.json({
    period,
    showAmounts: p.showAmounts,
    // 排行榜金額跟著藝人的「公開顯示金額」設定；自己的金額與差距永遠看得到
    board: board.slice(0, 20).map((r, i) => ({ rank: i + 1, name: r.name, avatar: r.avatar, badge: r.badge, count: r.count, total: p.showAmounts ? r.total : null, isMe: r.fanId === fanId })),
    me,
    loggedIn: !!fanId,
    achievements: ach,
  });
}
