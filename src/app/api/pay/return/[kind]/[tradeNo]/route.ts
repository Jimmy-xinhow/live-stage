import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { formToObject, handleCallback } from "@/lib/pay-callback";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { pointsHome } from "@/lib/points";

// 付款後瀏覽器導回（POST），先處理一次結果再導到狀態頁
export async function POST(req: Request, { params }: { params: Promise<{ kind: string; tradeNo: string }> }) {
  const { kind, tradeNo } = await params;
  if (kind === "order") {
    const r = await handleCallback("order", tradeNo, await formToObject(req));
    // 遊戲的付費加成：付完直接回遊戲畫面，不停在訂單頁
    const db = await getDb();
    const [o] = await db.select({ gameId: orders.gameId, status: orders.status }).from(orders).where(eq(orders.tradeNo, tradeNo));
    if (o?.gameId && o.status === "paid" && r?.slug) return NextResponse.redirect(`${env.baseUrl}/p/${r.slug}/game`, 303);
    return NextResponse.redirect(`${env.baseUrl}/o/${tradeNo}`, 303);
  }
  await handleCallback("points", tradeNo, await formToObject(req));
  return NextResponse.redirect(`${env.baseUrl}${await pointsHome(tradeNo)}?t=${tradeNo}`, 303);
}
