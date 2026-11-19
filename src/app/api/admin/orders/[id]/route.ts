import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { fans, orders, performers } from "@/lib/db/schema";
import { adminActor, isAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { refundOrder } from "@/lib/orders";

const Body = z.object({ action: z.literal("refund"), note: z.string().trim().max(120).default("") });

/** 平台端退款：標記訂單已退款、退回服務費點數，款項由表演者自行退還 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const id = (await params).id;

  const r = await refundOrder({ orderId: id, by: "admin", note: parsed.data.note });
  if (!r) return NextResponse.json({ error: "找不到這筆已付款的訂單" }, { status: 404 });

  const db = await getDb();
  const [p] = await db.select({ name: performers.displayName }).from(performers).where(eq(performers.id, r.order.performerId));
  await audit({
    actor: await adminActor(), req, action: "refund",
    targetType: "order", targetId: id, targetName: r.order.tradeNo,
    detail: `${p?.name ?? ""} NT$${r.order.amount}${parsed.data.note ? `・${parsed.data.note}` : ""}`,
  });

  // 觀眾的訂單頁會即時顯示「已退款」，不另外送訊息
  return NextResponse.json({ ok: true, needsGatewayRefund: r.needsGatewayRefund });
}
