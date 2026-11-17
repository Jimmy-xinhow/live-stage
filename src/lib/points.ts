import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { performers, pointPurchases } from "./db/schema";
import { applyPoints } from "./billing";
import { pushMessage } from "./line";
import { POINT_PACKAGES } from "./env";
import { newTradeNo } from "./orders";
import { FEATURES } from "./features";

export async function createPurchase(performerId: string, packageId: string) {
  const pkg = POINT_PACKAGES.find((x) => x.id === packageId);
  if (!pkg) return null;
  const db = await getDb();
  const [row] = await db
    .insert(pointPurchases)
    .values({ performerId, tradeNo: newTradeNo("PT"), packageId: pkg.id, priceNt: pkg.priceNt, pointsCents: pkg.points * 100 })
    .returning();
  return { purchase: row, pkg };
}

/** 購點付款成功（冪等） */
export async function markPurchasePaid(tradeNo: string, raw?: unknown) {
  const db = await getDb();
  const done = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(pointPurchases)
      .set({ status: "paid", paidAt: new Date(), rawNotify: raw ?? null })
      .where(and(eq(pointPurchases.tradeNo, tradeNo), eq(pointPurchases.status, "pending")))
      .returning();
    if (!row) return null;
    const balance = await applyPoints(tx, row.performerId, row.pointsCents, "purchase", { purchaseId: row.id, note: `購買 ${row.priceNt} 元方案` });
    // 補點後重置低餘額提醒
    await tx.update(performers).set({ lowBalanceNotifiedAt: null }).where(eq(performers.id, row.performerId));
    return { row, balance };
  });
  if (done) {
    const [p] = await db.select().from(performers).where(eq(performers.id, done.row.performerId));
    if (p?.lineUserId) await pushMessage(p.lineUserId, [{ type: "text", text: `✅ 已儲值 ${done.row.pointsCents / 100} 點，目前餘額 ${done.balance / 100} 點` }]);
  }
  return done?.row ?? null;
}

export async function markPurchaseFailed(tradeNo: string, raw?: unknown) {
  const db = await getDb();
  await db.update(pointPurchases).set({ status: "failed", rawNotify: raw ?? null }).where(and(eq(pointPurchases.tradeNo, tradeNo), eq(pointPurchases.status, "pending")));
}

/** 購點完成後要回到哪一個後台 */
export async function pointsHome(tradeNo: string) {
  const db = await getDb();
  const [r] = await db.select({ t: performers.accountType }).from(pointPurchases).innerJoin(performers, eq(performers.id, pointPurchases.performerId)).where(eq(pointPurchases.tradeNo, tradeNo));
  return r?.t === "organizer" && FEATURES.events ? "/org/points" : "/dashboard/points";
}
