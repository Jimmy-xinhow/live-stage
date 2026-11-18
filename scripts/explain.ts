/**
 * 熱查詢的索引驗證。
 *
 * 自我審查清單 B12：「還沒做的是實際用 EXPLAIN 驗證熱查詢」。
 * 這支腳本灌進一份有量的假資料（預設 5 萬筆訂單、3 千位粉絲），
 * 然後對每一條現場會跑的查詢做 EXPLAIN ANALYZE，把是否走到索引印出來。
 *
 * 跑法：npx tsx scripts/explain.ts
 * 用記憶體 PGlite，不會碰到任何真的資料庫。
 */
process.env.PGLITE_DIR = ":memory:";
process.env.SEED_DEMO = "false";

import { getDb } from "../src/lib/db";
import { fans, follows, liveSessions, orders, performers, usageEvents } from "../src/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const ORDERS = Number(process.env.N_ORDERS ?? 50_000);
const FANS = Number(process.env.N_FANS ?? 3_000);

async function main() {
  const db = await getDb();

  console.log(`灌資料：${FANS} 位粉絲、${ORDERS} 筆訂單…`);
  const [p] = await db.insert(performers).values({ slug: "load", displayName: "壓測", lineUserId: "Uload", pointsCents: 10_000_00 }).returning();
  // 平台上不會只有一位表演者。只有兩位的話 performer_id 幾乎沒有選擇性，
  // 規劃器會判斷全表掃描比較快——那是資料造錯，不是索引沒用
  const others: string[] = [];
  for (let i = 0; i < 200; i++) {
    const [row] = await db.insert(performers).values({ slug: `load-${i}`, displayName: `表演者 ${i}`, lineUserId: `Uload-${i}` }).returning({ id: performers.id });
    others.push(row.id);
  }
  // 真實分布：一位表演者一年演幾百場，每場幾十筆。全部塞在同一場會讓
  // EXPLAIN 得到錯的結論（整場就是整張表，那本來就該全表掃描）
  const sessions: string[] = [];
  for (let i = 0; i < 400; i++) {
    const [row] = await db.insert(liveSessions).values({ performerId: p.id, location: `場地 ${i}`, mode: "onsite" }).returning({ id: liveSessions.id });
    sessions.push(row.id);
  }
  const s = { id: sessions[0] };
  await db.update(performers).set({ liveSessionId: s.id }).where(eq(performers.id, p.id));

  const fanRows = Array.from({ length: FANS }, (_, i) => ({ lineUserId: `Uf${i}`, name: `粉絲${i}` }));
  const inserted: string[] = [];
  for (let i = 0; i < fanRows.length; i += 500) {
    const r = await db.insert(fans).values(fanRows.slice(i, i + 500)).returning({ id: fans.id });
    inserted.push(...r.map((x) => x.id));
  }
  for (let i = 0; i < inserted.length; i += 500)
    await db.insert(follows).values(inserted.slice(i, i + 500).map((id) => ({ performerId: p.id, fanId: id })));

  const now = Date.now();
  for (let i = 0; i < ORDERS; i += 1000) {
    const batch = Array.from({ length: Math.min(1000, ORDERS - i) }, (_, k) => {
      const n = i + k;
      const paid = new Date(now - Math.floor(Math.random() * 365) * 86400_000);
      return {
        // 這位主角佔一成，其餘平均分給 200 位——接近真實的長尾分布
        performerId: n % 10 === 0 ? p.id : others[n % others.length],
        sessionId: sessions[n % sessions.length],
        kind: n % 3 === 0 ? ("request" as const) : ("tip" as const),
        itemTitle: n % 3 === 0 ? `歌 ${n % 200}` : null,
        tradeNo: `L${n.toString(36).padStart(10, "0")}`,
        amount: 50 + (n % 20) * 50,
        nickname: `客${n % 500}`,
        fanId: inserted[n % inserted.length],
        status: n % 50 === 0 ? ("refunded" as const) : ("paid" as const),
        payMode: "manual" as const,
        paidAt: paid,
        feeCents: 100,
        queueStatus: n % 97 === 0 ? ("waiting" as const) : ("done" as const),
        queueSeq: n % 97 === 0 ? n : null,
      };
    });
    await db.insert(orders).values(batch as never);
  }
  await db.insert(usageEvents).values(Array.from({ length: 5000 }, (_, i) => ({ name: i % 2 ? "order_paid" : "go_live", performerId: p.id })));
  await db.execute(sql`analyze`);

  const QUERIES: [string, string][] = [
    ["排隊（大螢幕每 5 秒跑一次）", `select * from orders where session_id = '${s.id}' and queue_status in ('waiting','playing') order by queue_seq`],
    ["留言牆最近 20 筆", `select * from orders where performer_id = '${p.id}' and status = 'paid' and hidden = false order by paid_at desc limit 20`],
    ["今日總計", `select count(*)::int, sum(amount)::int from orders where performer_id = '${p.id}' and status = 'paid' and paid_at >= now() - interval '1 day'`],
    ["對帳匯出（一個月）", `select * from orders where performer_id = '${p.id}' and status in ('paid','refunded') and paid_at >= now() - interval '30 days' and paid_at < now() order by paid_at`],
    ["排行榜（本場）", `select fan_id, sum(amount)::int t from orders where session_id = '${s.id}' and status = 'paid' group by fan_id order by t desc limit 3`],
    ["粉絲名單", `select f.id, f.name, count(o.id)::int n, coalesce(sum(o.amount),0)::int total from follows fo join fans f on f.id = fo.fan_id left join orders o on o.fan_id = f.id and o.performer_id = '${p.id}' and o.status = 'paid' where fo.performer_id = '${p.id}' group by f.id, f.name order by total desc limit 50`],
    ["某位粉絲的紀錄", `select * from orders where performer_id = '${p.id}' and fan_id = '${inserted[0]}' order by paid_at desc limit 20`],
    ["埋點彙總", `select name, count(*)::int, count(distinct performer_id)::int from usage_events where created_at >= now() - interval '30 days' group by name`],
  ];

  console.log("");
  for (const [label, q] of QUERIES) {
    const out = (await db.execute(sql.raw(`explain (analyze, buffers, format text) ${q}`))) as unknown as
      | { "QUERY PLAN": string }[]
      | { rows: { "QUERY PLAN": string }[] };
    const rows = Array.isArray(out) ? out : out.rows;
    const plan = rows.map((r) => r["QUERY PLAN"]).join("\n");
    const scan = /Seq Scan on (\w+)/.exec(plan);
    const ms = /Execution Time: ([\d.]+) ms/.exec(plan);
    const mark = scan ? "⚠ 全表掃描" : "✓ 走索引";
    console.log(`${mark}  ${label}　${ms ? `${ms[1]} ms` : ""}${scan ? `（${scan[1]}）` : ""}`);
    if (scan || Number(ms?.[1] ?? 0) > 50) console.log(plan.split("\n").slice(0, 6).map((l) => "    " + l).join("\n"));
  }
}

main().then(() => process.exit(0));
