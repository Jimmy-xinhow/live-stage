/**
 * 備份還原演練的對帳工具。
 *
 * 備份沒有演練過就不算備份。流程是：
 *   1. 對線上資料庫跑一次這支，記下每張表的筆數與最新一筆的時間
 *   2. 從備份還原到一個新的資料庫
 *   3. 對還原出來的那個跑一次，兩份輸出逐行比對
 *
 * 跑法：DATABASE_URL=... npx tsx scripts/backup-check.ts
 */
import { sql } from "drizzle-orm";
import { getDb } from "../src/lib/db";

const TABLES = [
  "performers", "orders", "point_ledger", "point_purchases", "live_sessions", "shows",
  "menu_items", "fans", "follows", "games", "band_members", "order_splits",
  "admin_logs", "reports", "usage_events", "auth_tokens", "pay_qr_images",
];

async function main() {
  const db = await getDb();
  console.log(`對帳時間：${new Date().toISOString()}`);
  console.log("表名".padEnd(20), "筆數".padStart(10), "  最新一筆");

  for (const t of TABLES) {
    try {
      // 有些表沒有 created_at（例如拆帳快照、計數器），所以先問一下再查
      const hasCreated = (await db.execute(
        sql.raw(`select count(*)::int as n from information_schema.columns where table_name = '${t}' and column_name = 'created_at'`),
      )) as unknown as { n: number }[] | { rows: { n: number }[] };
      const withTime = ((Array.isArray(hasCreated) ? hasCreated[0] : hasCreated.rows?.[0])?.n ?? 0) > 0;
      const out = (await db.execute(
        sql.raw(`select count(*)::int as n${withTime ? ", max(created_at) as latest" : ", null as latest"} from "${t}"`),
      )) as unknown as { n: number; latest: string | null }[] | { rows: { n: number; latest: string | null }[] };
      const row = (Array.isArray(out) ? out[0] : out.rows?.[0]) ?? { n: 0, latest: null };
      console.log(t.padEnd(20), String(row.n).padStart(10), " ", row.latest ?? "—");
    } catch (e) {
      console.log(t.padEnd(20), "讀不到".padStart(10), " ", String(e).slice(0, 60));
    }
  }

  // 帳務的總和要對得起來，筆數一樣但金額不同就是還原出問題
  const money = (await db.execute(
    sql.raw(`select coalesce(sum(amount),0)::int as paid, coalesce(sum(fee_cents),0)::int as fee from orders where status = 'paid'`),
  )) as unknown as { paid: number; fee: number }[] | { rows: { paid: number; fee: number }[] };
  const m = (Array.isArray(money) ? money[0] : money.rows?.[0]) ?? { paid: 0, fee: 0 };
  console.log(`\n已付款總額 NT$${m.paid.toLocaleString()}　服務費 ${(m.fee / 100).toLocaleString()} 點`);
  console.log("兩邊的這三個數字一致，才算還原成功。");
}

main().then(() => process.exit(0));
