import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { fans, orders } from "@/lib/db/schema";
import { requirePerformer } from "@/lib/auth";
import { refundOrder } from "@/lib/orders";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), reply: z.string().trim().min(1).max(200) }),
  z.object({ action: z.literal("hide") }),
  z.object({ action: z.literal("unhide") }),
  z.object({ action: z.literal("refund"), note: z.string().trim().max(120).default("") }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const b = parsed.data;
  const db = await getDb();
  const id = (await params).id;

  if (b.action === "refund") {
    const r = await refundOrder({ orderId: id, by: "performer", note: b.note, performerId: auth.performer.id });
    if (!r) return NextResponse.json({ error: "找不到這筆已付款的訂單" }, { status: 404 });
    // 觀眾的訂單頁會即時顯示「已退款」，不另外送訊息
    return NextResponse.json({ ok: true, needsGatewayRefund: r.needsGatewayRefund });
  }

  const where = and(eq(orders.id, id), eq(orders.performerId, auth.performer.id), eq(orders.status, "paid"));
  const set = b.action === "reply" ? { reply: b.reply, repliedAt: new Date() } : { hidden: b.action === "hide" };
  const [o] = await db.update(orders).set(set).where(where).returning();
  if (!o) return NextResponse.json({ error: "找不到這筆紀錄" }, { status: 404 });
  // 回覆會顯示在留言牆與觀眾的訂單頁上
  return NextResponse.json({ ok: true });
}
