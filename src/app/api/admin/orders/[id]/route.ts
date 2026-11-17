import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { fans, orders, performers } from "@/lib/db/schema";
import { adminActor, isAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { refundOrder } from "@/lib/orders";
import { pushMessage } from "@/lib/line";

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

  if (r.order.fanId) {
    const [f] = await db.select().from(fans).where(eq(fans.id, r.order.fanId));
    if (f) {
      await pushMessage(f.lineUserId, [{
        type: "text",
        text: `你的${r.order.itemTitle ? `〈${r.order.itemTitle}〉點歌` : "打賞"} NT$${r.order.amount} 已被標記為退款${parsed.data.note ? `：${parsed.data.note}` : "。"}\n款項會由表演者直接退還給你。`,
      }]).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true, needsGatewayRefund: r.needsGatewayRefund });
}
