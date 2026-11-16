import { NextResponse } from "next/server";
import { orderStatus } from "@/lib/orders";
import { isFollowing } from "@/lib/fans";
import { getFanId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ tradeNo: string }> }) {
  const s = await orderStatus((await params).tradeNo);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  // 付款確認後會自動追蹤，讓結果頁即時反映
  s.following = await isFollowing(s.performerId, await getFanId());
  return NextResponse.json(s);
}
