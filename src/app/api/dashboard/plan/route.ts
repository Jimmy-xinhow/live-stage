import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { LIMITS, guard } from "@/lib/ratelimit";
import { changePlan } from "@/lib/subscription";
import { fmtPoints } from "@/lib/billing";

const Body = z.object({ plan: z.enum(["free", "base", "play", "all"]) });

/** 換方案。月費從點數餘額扣，規則見 lib/subscription.ts */
export async function POST(req: Request) {
  const rl = guard(req, "plan", LIMITS.write);
  if (rl) return rl;
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  const r = await changePlan(auth.performer.id, parsed.data.plan);
  if (!r.ok) {
    if (r.reason === "insufficient")
      return NextResponse.json(
        { error: `點數不足，還差 ${fmtPoints(r.needCents ?? 0)} 點。先到點數頁儲值再回來升級。`, need: r.needCents },
        { status: 402 },
      );
    if (r.reason === "same") return NextResponse.json({ error: "已經是這個方案了" }, { status: 400 });
    return NextResponse.json({ error: "找不到帳號" }, { status: 404 });
  }

  // 這筆扣款已經記在點數帳本裡，那就是軌跡；後台稽核紀錄是給平台管理動作用的

  return NextResponse.json({ plan: r.plan, until: r.until, charged: r.chargedCents, balance: r.balanceCents });
}
