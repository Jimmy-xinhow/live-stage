import { NextResponse } from "next/server";
import { claimOrder } from "@/lib/orders";

// 觀眾按「我付好了」
export async function POST(_: Request, { params }: { params: Promise<{ tradeNo: string }> }) {
  const o = await claimOrder((await params).tradeNo);
  return o ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "這筆已處理" }, { status: 409 });
}
