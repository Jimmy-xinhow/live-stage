import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createPurchase } from "@/lib/points";
import { buildCheckout, platformCreds } from "@/lib/payments";
import { env } from "@/lib/env";

/** 購買點數：付款進星昊自己的金流帳號 */
export async function POST(req: Request) {
  const auth = await requireAccount();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { packageId } = (await req.json()) as { packageId: string };
  const creds = platformCreds();
  if (!creds && !env.allowMock) return NextResponse.json({ error: "購點暫停中" }, { status: 503 });
  const r = await createPurchase(auth.performer.id, packageId);
  if (!r) return NextResponse.json({ error: "方案不存在" }, { status: 400 });
  if (!creds) return NextResponse.json({ redirect: `/mock-pay?k=points&t=${r.purchase.tradeNo}` });
  return NextResponse.json(
    buildCheckout(creds, { kind: "points", tradeNo: r.purchase.tradeNo, amount: r.pkg.priceNt, itemName: `點數 ${r.pkg.label}`, createdAt: r.purchase.createdAt, backPath: auth.performer.accountType === "organizer" ? "/org/points" : "/dashboard/points" }),
  );
}
