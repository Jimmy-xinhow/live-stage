import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { orders, pointPurchases } from "./db/schema";
import { env } from "./env";
import { parseCallback, performerCreds, platformCreds, type Creds, type PayKind } from "./payments";
import { getPerformerById, markOrderFailed, markOrderPaid } from "./orders";
import { markPurchaseFailed, markPurchasePaid } from "./points";

export async function formToObject(req: Request) {
  const o: Record<string, string> = {};
  (await req.formData()).forEach((v, k) => (o[k] = String(v)));
  return o;
}

/** 處理金流回傳（背景通知與前台導回共用）。回傳 null 表示驗證失敗 */
export async function handleCallback(kind: PayKind, tradeNo: string, params: Record<string, string>): Promise<{ creds: Creds; slug?: string } | null> {
  const db = await getDb();
  let creds: Creds | null = null;
  let expectedAmount = 0;
  let slug: string | undefined;

  if (kind === "order") {
    const [o] = await db.select().from(orders).where(eq(orders.tradeNo, tradeNo));
    if (!o) return null;
    const p = await getPerformerById(o.performerId);
    creds = p ? performerCreds(p) : null;
    expectedAmount = o.amount;
    slug = p?.slug;
  } else {
    const [row] = await db.select().from(pointPurchases).where(eq(pointPurchases.tradeNo, tradeNo));
    if (!row) return null;
    creds = platformCreds();
    expectedAmount = row.priceNt;
  }
  if (!creds) return null;

  const r = parseCallback(creds, params);
  if (!r || r.tradeNo !== tradeNo) return null;

  if (r.success && r.amount === expectedAmount && !(r.simulated && env.paymentEnv === "production")) {
    if (kind === "order") await markOrderPaid(tradeNo, r);
    else await markPurchasePaid(tradeNo, r.raw);
  } else if (!r.success) {
    if (kind === "order") await markOrderFailed(tradeNo, r.raw);
    else await markPurchaseFailed(tradeNo, r.raw);
  }
  return { creds, slug };
}
