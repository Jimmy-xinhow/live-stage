import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { redeemReward, RewardError } from "@/lib/rewards";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  try {
    await redeemReward(auth.performer, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RewardError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
