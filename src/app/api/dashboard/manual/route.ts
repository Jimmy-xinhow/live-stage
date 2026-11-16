import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { displayName, pendingManual } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** 待確認的轉帳（控制台輪詢用） */
export async function GET() {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const list = await pendingManual(auth.performer);
  return NextResponse.json({
    items: list.map((o) => ({
      id: o.id,
      code: o.payCode,
      amount: o.amount,
      name: displayName(o),
      itemTitle: o.itemTitle,
      message: o.message,
      claimed: !!o.claimedAt,
      expired: o.status === "expired",
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
