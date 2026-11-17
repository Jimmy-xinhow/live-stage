import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { liveSessions, orders, performers } from "./db/schema";
import { reportError } from "./errors";

/**
 * 每小時的整理工作。全部都寫成可以重複執行（冪等），
 * 排程漏跑或重跑都不會出問題。
 */
export async function runMaintenance() {
  const db = await getDb();
  const now = new Date();
  const out: Record<string, number> = {};

  try {
    // 1. 付款超過一天還停在 pending 的訂單，標記逾時
    const expired = await db
      .update(orders)
      .set({ status: "expired" })
      .where(and(eq(orders.status, "pending"), lt(orders.createdAt, new Date(now.getTime() - 86400_000))))
      .returning({ id: orders.id });
    out.expiredOrders = expired.length;

    // 2. 等藝人確認轉帳超過三天的，也標記逾時（避免一直掛在待處理）
    const staleAwaiting = await db
      .update(orders)
      .set({ status: "expired" })
      .where(and(eq(orders.status, "awaiting"), lt(orders.createdAt, new Date(now.getTime() - 3 * 86400_000))))
      .returning({ id: orders.id });
    out.expiredAwaiting = staleAwaiting.length;

    // 3. 忘記按結束、已經超過 12 小時的演出場次，自動收掉
    //    （活動本身不改狀態：列表是用開始時間篩的，改狀態會影響主辦的「已刊登」統計）
    const stale = await db
      .update(liveSessions)
      .set({ endedAt: now })
      .where(and(isNull(liveSessions.endedAt), lt(liveSessions.startedAt, new Date(now.getTime() - 12 * 3600_000))))
      .returning({ id: liveSessions.id, performerId: liveSessions.performerId });
    out.closedSessions = stale.length;
    if (stale.length) {
      await db
        .update(performers)
        .set({ liveSessionId: null })
        .where(sql`${performers.liveSessionId} in ${stale.map((s) => s.id)}`);
    }
  } catch (e) {
    reportError("maintenance", e);
    throw e;
  }
  return out;
}
