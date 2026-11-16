import { NextResponse } from "next/server";
import { getFanId } from "@/lib/session";
import { claimReward, RewardError } from "@/lib/rewards";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const fanId = await getFanId();
  if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入" }, { status: 401 });
  try {
    const fa = await claimReward(fanId, (await params).id);
    return NextResponse.json({ ok: true, status: fa.status, code: fa.claimCode });
  } catch (e) {
    if (e instanceof RewardError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
