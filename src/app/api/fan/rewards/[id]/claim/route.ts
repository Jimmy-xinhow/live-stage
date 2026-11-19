import { NextResponse } from "next/server";
import { ensureFanId } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { claimReward, RewardError } from "@/lib/rewards";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  // 不需要登入：沒有身分就當場發一個，使用者完全不會被擋下來
  const fanId = await ensureFanId();
  try {
    const fa = await claimReward(fanId, (await params).id);
    return NextResponse.json({ ok: true, status: fa.status, code: fa.claimCode });
  } catch (e) {
    if (e instanceof RewardError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
