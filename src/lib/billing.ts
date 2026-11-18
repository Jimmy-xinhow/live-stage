import { eq, sql } from "drizzle-orm";
import type { DB } from "./db";
import { performers, pointLedger } from "./db/schema";
import { env } from "./env";
import { planBySlug } from "./plans";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** 點數增減（在交易內呼叫）。回傳新餘額 */
export async function applyPoints(
  tx: Tx | DB,
  performerId: string,
  deltaCents: number,
  reason: "signup_bonus" | "purchase" | "fee" | "fee_refund" | "live_notify" | "broadcast" | "adjust" | "promo" | "event_promo" | "event_notify" | "plan",
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

/**
 * 每筆成交收取的服務費（分）。
 *
 * 費率跟著表演者的方案走：免費 3%、付費方案 1%。見 lib/plans.ts。
 * 沒傳 plan 的舊呼叫點會退回環境變數的預設值，但新程式一律要傳——
 * 方案頁上寫了費率差，程式沒吃 plan 的話那就是不實陳述。
 */
export function feeFor(amountNt: number, plan?: string | null) {
  const rate = plan == null ? env.billing.feeRate : planBySlug(plan).feeRate;
  return Math.round(amountNt * 100 * rate);
}

/** 顯示用的百分比，例如 3 或 1 */
export const feePct = (plan?: string | null) => (plan == null ? env.billing.feeRate : planBySlug(plan).feeRate) * 100;

/** 餘額低於透支上限就暫停接單 */
export const canAcceptOrders = (pointsCents: number) => pointsCents > -env.billing.overdraftCents;

export const fmtPoints = (cents: number) => (cents / 100).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
