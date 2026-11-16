import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, pointPurchases } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getPerformerById, markOrderFailed, markOrderPaid } from "@/lib/orders";
import { markPurchaseFailed, markPurchasePaid, pointsHome } from "@/lib/points";
import { platformCreds } from "@/lib/payments";

export async function POST(req: Request) {
  if (!env.allowMock) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const { k, t, result } = (await req.json()) as { k: "order" | "points"; t: string; result: "success" | "fail" };
  const db = await getDb();
  if (k === "points") {
    if (platformCreds()) return NextResponse.json({ error: "not mock" }, { status: 400 });
    if (result === "success") await markPurchasePaid(t);
    else await markPurchaseFailed(t);
    return NextResponse.json({ redirect: `${await pointsHome(t)}?t=${t}` });
  }
  const [o] = await db.select().from(orders).where(eq(orders.tradeNo, t));
  if (!o) return NextResponse.json({ error: "not found" }, { status: 404 });
  const p = await getPerformerById(o.performerId);
  if (p?.gateway !== "mock") return NextResponse.json({ error: "not mock" }, { status: 400 });
  if (result === "success") await markOrderPaid(t, { paymentType: "Mock", gatewayTradeNo: "", raw: null });
  else await markOrderFailed(t);
  return NextResponse.json({ redirect: o.gameId && result === "success" ? `/p/${p.slug}/game` : `/o/${t}` });
}
