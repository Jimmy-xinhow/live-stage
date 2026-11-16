import { eq, sql } from "drizzle-orm";
import type { DB } from "./db";
import { performers, pointLedger } from "./db/schema";
import { env } from "./env";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** 點數增減（在交易內呼叫）。回傳新餘額 */
export async function applyPoints(
  tx: Tx | DB,
  performerId: string,
  deltaCents: number,
  reason: "signup_bonus" | "purchase" | "fee" | "live_notify" | "broadcast" | "adjust" | "promo" | "event_promo" | "event_notify",
  extra: { orderId?: string; purchaseId?: string; note?: string } = {},
) {
  const [p] = await tx
    .update(performers)
    .set({ pointsCents: sql`${performers.pointsCents} + ${deltaCents}` })
    .where(eq(performers.id, performerId))
    .returning({ balance: performers.pointsCents });
  await tx.insert(pointLedger).values({
    performerId,
    deltaCents,
    balanceAfterCents: p.balance,
    reason,
    orderId: extra.orderId ?? null,
    purchaseId: extra.purchaseId ?? null,
    note: extra.note ?? "",
  });
  return p.balance;
}

/** 每筆成交收取的服務費（分）：金額 × 3% */
export const feeFor = (amountNt: number) => Math.round(amountNt * 100 * env.billing.feeRate);

/** 餘額低於透支上限就暫停接單 */
export const canAcceptOrders = (pointsCents: number) => pointsCents > -env.billing.overdraftCents;

export const fmtPoints = (cents: number) => (cents / 100).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
