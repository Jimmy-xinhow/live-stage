import { and, desc, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { usageEvents } from "./db/schema";

/**
 * 功能埋點。
 *
 * 「功能都做了但沒有埋點，不知道誰在用、用多久」——這是自我審查清單上的 B28。
 * 沒有這個，之後要收掉哪個功能、先優化哪一個，就只能用感覺決定。
 *
 * 刻意只記事件名稱與表演者，不記內容、金額、觀眾身分或 IP：
 * 要回答的問題是「有沒有人用」，不是「誰做了什麼」。
 */
export const EVENTS = {
  go_live: "開始演出",
  end_live: "結束演出",
  order_paid: "成交一筆",
  manual_confirm: "手動確認轉帳",
  refund: "退款",
  game_start: "開一場遊戲",
  game_boost: "付費加成",
  plan_change: "換方案",
  show_add: "發布演出場次",
  ledger_export: "匯出對帳",
  poster_open: "開啟公告成圖",
  band_save: "設定樂團拆帳",
  band_join: "團員加入",
  wish_add: "觀眾許願",
  checkin: "觀眾簽到",
} as const;
export type EventName = keyof typeof EVENTS;

/**
 * 記一筆。永遠不要讓埋點擋住正事——所以吞掉所有錯誤，也不 await 失敗。
 * 呼叫端可以直接 `track("go_live", p.id)` 不加 await。
 */
export function track(name: EventName, performerId?: string | null) {
  return (async () => {
    try {
      const db = await getDb();
      await db.insert(usageEvents).values({ name, performerId: performerId ?? null });
    } catch {
      // 埋點壞掉不該影響任何人的演出
    }
  })();
}

/** 某段期間每個功能被用幾次、有幾位表演者用過 */
export async function usageSummary(days = 30) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await db
    .select({
      name: usageEvents.name,
      n: sql<number>`count(*)::int`,
      people: sql<number>`count(distinct ${usageEvents.performerId})::int`,
    })
    .from(usageEvents)
    .where(gte(usageEvents.createdAt, since))
    .groupBy(usageEvents.name)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({
    name: r.name,
    label: EVENTS[r.name as EventName] ?? r.name,
    count: Number(r.n),
    people: Number(r.people),
  }));
}

/** 完全沒有人用過的功能。這是這張表真正的用處——問題出在沒資料的那幾列 */
export async function unusedFeatures(days = 30) {
  const used = new Set((await usageSummary(days)).map((r) => r.name));
  return (Object.keys(EVENTS) as EventName[]).filter((k) => !used.has(k)).map((k) => ({ name: k, label: EVENTS[k] }));
}
