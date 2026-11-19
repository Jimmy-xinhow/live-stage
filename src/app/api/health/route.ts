import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { schedulerStatus } from "@/lib/scheduler";
import { busStats } from "@/lib/livebus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 健康檢查。給外部的監控服務（UptimeRobot、Railway 的 healthcheck）每分鐘打一次。
 *
 * 真的去查一次資料庫，不是只回 200——連得上網站但連不上資料庫的狀況，
 * 對使用者來說一樣是壞掉的。
 */
export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    const d = await getDb();
    await d.execute(sql`select 1`);
    db = true;
  } catch {
    db = false;
  }

  const body = {
    ok: db,
    db,
    ms: Date.now() - started,
    scheduler: schedulerStatus(),
    live: busStats(),
    at: new Date().toISOString(),
  };
  return Response.json(body, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
