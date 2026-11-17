import { desc, eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { adminLogs } from "./db/schema";
import { clientIp } from "./ratelimit";
import { reportError } from "./errors";

export type AuditAction =
  | "suspend" | "activate" | "adjust_points" | "refund"
  | "hide_review" | "unhide_review" | "unpublish_event" | "publish_event"
  | "handle_report";

/** 記一筆後台操作。失敗不擋主流程，但會寫到 server log */
export async function audit(input: {
  actor: string;
  action: AuditAction;
  targetType: "performer" | "order" | "event" | "review" | "report";
  targetId?: string | null;
  targetName?: string;
  detail?: string;
  req?: Request;
}) {
  try {
    const db = await getDb();
    await db.insert(adminLogs).values({
      actor: input.actor.slice(0, 60),
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetName: (input.targetName ?? "").slice(0, 60),
      detail: (input.detail ?? "").slice(0, 200),
      ip: input.req ? clientIp(input.req.headers).slice(0, 45) : "",
    });
  } catch (e) {
    reportError("[audit] 寫入稽核紀錄失敗", e);
  }
}

/** 後台的操作紀錄列表 */
export async function auditLog(limit = 200, targetId?: string) {
  const db = await getDb();
  const q = db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
  return targetId ? await db.select().from(adminLogs).where(and(eq(adminLogs.targetId, targetId))).orderBy(desc(adminLogs.createdAt)).limit(limit) : await q;
}
