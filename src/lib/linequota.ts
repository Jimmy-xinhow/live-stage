import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { lineOutbox, lineUsage } from "./db/schema";
import { env } from "./env";
import { reportError } from "./errors";

/**
 * LINE 推播的額度與重送。
 *
 * 兩個現實：
 * 1. 官方帳號的免費訊息有每月上限，按**收件人數**計算。超量不是變慢，是直接
 *    收不到或開始收費。所以群發之前要先問「這一發會不會爆」。
 * 2. 推播會失敗——LINE 端 5xx、網路抖一下都會。開演通知推不出去，表演者就少了
 *    一場的人，只寫進 log 等於沒有發生過。失敗要排進佇列重送。
 *
 * 上限值放在環境變數，因為它跟著帳號方案走，我們猜不出來。
 * 沒設（0）就不限制，只記錄用量——寧可不擋，也不要用錯的數字擋住該發的通知。
 */

const QUOTA = Number(process.env.LINE_MONTHLY_QUOTA ?? "0");
const MAX_ATTEMPTS = 5;

/** 台北時間的當月份。LINE 的額度按月重置，用台北時間算對得上帳單 */
export function monthKey(d = new Date()) {
  const t = new Date(d.getTime() + 8 * 3600_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function usage(month = monthKey()) {
  const db = await getDb();
  const [row] = await db.select().from(lineUsage).where(eq(lineUsage.month, month));
  const sent = row?.sent ?? 0;
  return {
    month,
    sent,
    failed: row?.failed ?? 0,
    quota: QUOTA,
    /** 沒設上限就回 null，介面要顯示「未設定」而不是假裝有數字 */
    left: QUOTA > 0 ? Math.max(0, QUOTA - sent) : null,
    pct: QUOTA > 0 ? Math.min(100, Math.round((sent / QUOTA) * 100)) : null,
  };
}

/** 這一發（n 位收件人）會不會超過當月額度 */
export async function wouldExceed(n: number) {
  if (QUOTA <= 0) return null;
  const u = await usage();
  if (u.left !== null && n > u.left) return { left: u.left, need: n };
  return null;
}

export async function record(sent: number, failed = 0) {
  if (!sent && !failed) return;
  const db = await getDb();
  const month = monthKey();
  await db
    .insert(lineUsage)
    .values({ month, sent, failed })
    .onConflictDoUpdate({
      target: lineUsage.month,
      set: { sent: sql`${lineUsage.sent} + ${sent}`, failed: sql`${lineUsage.failed} + ${failed}`, updatedAt: new Date() },
    });
}

/** 退避：1 分、5 分、25 分、2 小時、10 小時 */
const nextDelay = (attempts: number) => Math.min(10 * 3600_000, 60_000 * 5 ** attempts);

export async function enqueue(to: string[], messages: unknown[], kind: string, performerId?: string | null, error = "") {
  if (!to.length) return;
  const db = await getDb();
  await db.insert(lineOutbox).values(
    to.map((t) => ({
      to: t,
      messages,
      kind: kind.slice(0, 16),
      performerId: performerId ?? null,
      error: error.slice(0, 200),
      nextAt: new Date(Date.now() + nextDelay(0)),
    })),
  );
}

/**
 * 重送佇列裡到期的訊息。排程每小時呼叫。
 * 一次只處理一批，而且每一筆各自判斷成敗——一個收件人被封鎖不該拖累其他人。
 */
export async function retryOutbox(limit = 100) {
  if (!env.line.messagingAccessToken) return { sent: 0, failed: 0, dead: 0, checked: 0 };
  const db = await getDb();
  const due = await db
    .select()
    .from(lineOutbox)
    .where(and(eq(lineOutbox.status, "pending"), lte(lineOutbox.nextAt, new Date())))
    .limit(limit);

  let sent = 0, failed = 0, dead = 0;
  for (const row of due) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.line.messagingAccessToken}` },
      body: JSON.stringify({ to: row.to, messages: row.messages }),
    }).catch(() => null);

    const attempts = row.attempts + 1;
    if (res?.ok) {
      await db.update(lineOutbox).set({ status: "sent", attempts, sentAt: new Date(), error: "" }).where(eq(lineOutbox.id, row.id));
      sent++;
      continue;
    }

    // 400 多半是對方封鎖了官方帳號或 userId 失效，重送幾次也不會變。
    const permanent = !!res && res.status >= 400 && res.status < 500;
    const text = res ? `${res.status} ${(await res.text().catch(() => "")).slice(0, 150)}` : "連不上 LINE";
    if (permanent || attempts >= MAX_ATTEMPTS) {
      await db.update(lineOutbox).set({ status: "dead", attempts, error: text }).where(eq(lineOutbox.id, row.id));
      dead++;
    } else {
      await db.update(lineOutbox).set({ attempts, error: text, nextAt: new Date(Date.now() + nextDelay(attempts)) }).where(eq(lineOutbox.id, row.id));
      failed++;
    }
  }

  if (sent) await record(sent);
  if (dead) reportError("line-outbox", new Error(`${dead} 則推播重送到放棄`), { dead });
  return { sent, failed, dead, checked: due.length };
}

/** 後台看的：待重送、放棄、當月用量 */
export async function outboxStats() {
  const db = await getDb();
  const rows = await db
    .select({ status: lineOutbox.status, n: sql<number>`count(*)::int` })
    .from(lineOutbox)
    .groupBy(lineOutbox.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  return { pending: by.pending ?? 0, sent: by.sent ?? 0, dead: by.dead ?? 0, usage: await usage() };
}
