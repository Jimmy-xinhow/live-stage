import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { fans, orders } from "@/lib/db/schema";
import { requirePerformer } from "@/lib/auth";
import { pushMessage } from "@/lib/line";
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
    if (r.order.fanId) {
      const [f] = await db.select().from(fans).where(eq(fans.id, r.order.fanId));
      if (f) {
        await pushMessage(f.lineUserId, [{
          type: "text",
          text: `${auth.performer.displayName} 已將你的${r.order.itemTitle ? `〈${r.order.itemTitle}〉點歌` : "打賞"} NT$${r.order.amount} 標記為退款${b.note ? `：${b.note}` : "。"}\n款項會由表演者直接退還給你。`,
        }]);
      }
    }
    return NextResponse.json({ ok: true, needsGatewayRefund: r.needsGatewayRefund });
  }

  const where = and(eq(orders.id, id), eq(orders.performerId, auth.performer.id), eq(orders.status, "paid"));
  const set = b.action === "reply" ? { reply: b.reply, repliedAt: new Date() } : { hidden: b.action === "hide" };
  const [o] = await db.update(orders).set(set).where(where).returning();
  if (!o) return NextResponse.json({ error: "找不到這筆紀錄" }, { status: 404 });
  if (b.action === "reply" && o.fanId) {
    const [f] = await db.select().from(fans).where(eq(fans.id, o.fanId));
    if (f) await pushMessage(f.lineUserId, [{ type: "text", text: `💌 ${auth.performer.displayName} 回覆你：\n「${b.reply}」` }]);
  }
  return NextResponse.json({ ok: true });
}
