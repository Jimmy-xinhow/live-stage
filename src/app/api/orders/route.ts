import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, getPerformerBySlug, OrderError } from "@/lib/orders";
import { buildCheckout, performerCreds } from "@/lib/payments";
import { getFanId } from "@/lib/session";
import { LIMITS, guard } from "@/lib/ratelimit";

const Body = z.object({
  slug: z.string().min(1).max(40),
  menuItemId: z.string().uuid().nullish(),
  amount: z.number().int().positive(),
  nickname: z.string().max(30).default(""),
  message: z.string().max(120).default(""),
  isAnonymous: z.boolean().default(false),
  /** manual：轉帳到藝人收款碼後由藝人確認；auto：綠界／藍新刷卡 */
  payMode: z.enum(["manual", "auto"]).default("manual"),
  followOnPay: z.boolean().default(true),
  /** 互動遊戲的付費加成 */
  game: z.object({ id: z.string().uuid(), lane: z.number().int().min(0).max(5), unit: z.string().max(12) }).nullish(),
  back: z.string().regex(/^\/[\w\-/]*$/).max(80).optional(),
});

export async function POST(req: Request) {
  const rl = guard(req, "order", LIMITS.order);
  if (rl) return rl;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  const b = parsed.data;
  const p = await getPerformerBySlug(b.slug);
  if (!p) return NextResponse.json({ error: "找不到這位藝人" }, { status: 404 });

  try {
    const o = await createOrder(p, b, await getFanId());
    // 手動模式：直接到「我的點歌」頁看付款方式與點歌碼
    if (o.payMode === "manual") return NextResponse.json({ tradeNo: o.tradeNo, redirect: `/o/${o.tradeNo}` });
    const creds = performerCreds(p);
    if (!creds) return NextResponse.json({ tradeNo: o.tradeNo, redirect: `/mock-pay?k=order&t=${o.tradeNo}` });
    const checkout = buildCheckout(creds, {
      kind: "order",
      tradeNo: o.tradeNo,
      amount: o.amount,
      itemName: o.itemTitle ? `點歌 ${o.itemTitle}` : `打賞 ${p.displayName}`,
      createdAt: o.createdAt,
      backPath: b.back ?? `/p/${p.slug}`,
    });
    return NextResponse.json({ tradeNo: o.tradeNo, ...checkout });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
