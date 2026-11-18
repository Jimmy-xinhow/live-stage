import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { planIsPaid } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";
import { LIMITS, guard } from "@/lib/ratelimit";
import { track } from "@/lib/usage";

/**
 * 收入對帳明細，匯出成 CSV。
 *
 * 用途是報稅和跟店家核對，所以欄位照會計要看的順序排：
 * 時間、單號、品項、金額、服務費、淨額。金額一律用數字不加符號，
 * 丟進試算表才能直接加總。
 *
 * Excel 開 UTF-8 的 CSV 會變亂碼，所以前面加 BOM。這是台灣中小企業最常
 * 遇到的雷，不加的話對方打開只會看到問號。
 */

const TYPE: Record<string, string> = { request: "點歌", tip: "打賞" };
const STATUS: Record<string, string> = { paid: "已付款", refunded: "已退款" };
const PAY: Record<string, string> = { auto: "線上刷卡", manual: "轉帳／收款碼" };

/** CSV 欄位跳脫。逗號、引號、換行都要處理，否則一個留言就能毀掉整份報表 */
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const tpe = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d).replace(/\//g, "-");

export async function GET(req: Request) {
  const rl = guard(req, "ledger", LIMITS.write);
  if (rl) return rl;
  const auth = await requirePerformer();
  if (!auth) return new Response("請先登入", { status: 401 });
  track("ledger_export", auth.performer.id);
  if (!planIsPaid(effectivePlan(auth.performer)))
    return new Response("對帳明細匯出要點歌台方案以上。在後台的「方案」頁可以升級。", { status: 402 });

  // month=YYYY-MM；沒給就是當月。用台北時間的月份界線，不是 UTC
  const raw = new URL(req.url).searchParams.get("month") ?? "";
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  const now = new Date();
  const y = m ? Number(m[1]) : Number(tpe(now).slice(0, 4));
  const mo = m ? Number(m[2]) : Number(tpe(now).slice(5, 7));
  if (!(y >= 2020 && y <= 2100 && mo >= 1 && mo <= 12)) return new Response("月份格式錯誤", { status: 400 });
  // 台北是 UTC+8，所以當地月初等於 UTC 的前一天 16:00
  const from = new Date(Date.UTC(y, mo - 1, 1, -8));
  const to = new Date(Date.UTC(y, mo, 1, -8));

  const db = await getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(
      eq(orders.performerId, auth.performer.id),
      inArray(orders.status, ["paid", "refunded"]),
      gte(orders.paidAt, from),
      lt(orders.paidAt, to),
    ))
    .orderBy(asc(orders.paidAt));

  const head = ["付款時間", "訂單編號", "類型", "項目", "點歌人", "留言", "金額", "服務費", "實收", "付款方式", "狀態", "退款時間", "退款說明"];
  const lines = [head.join(",")];
  let gross = 0, fee = 0, net = 0;

  for (const o of rows) {
    const f = o.feeCents / 100;
    const refunded = o.status === "refunded";
    // 退款的那筆服務費會退回點數，所以淨額算 0，不能讓它灌水
    const amount = refunded ? 0 : o.amount;
    const feeShown = refunded ? 0 : f;
    gross += amount; fee += feeShown; net += amount - feeShown;
    lines.push([
      o.paidAt ? tpe(o.paidAt) : "",
      o.tradeNo,
      TYPE[o.kind] ?? o.kind,
      o.itemTitle ?? "",
      o.isAnonymous ? "匿名" : o.nickname,
      o.message,
      refunded ? `-${o.amount}` : o.amount,
      feeShown,
      amount - feeShown,
      PAY[o.payMode] ?? o.payMode,
      STATUS[o.status] ?? o.status,
      o.refundedAt ? tpe(o.refundedAt) : "",
      o.refundNote ?? "",
    ].map(cell).join(","));
  }

  lines.push("");
  lines.push(["合計", "", "", "", "", "", gross, fee, net, "", `${rows.length} 筆`, "", ""].map(cell).join(","));

  const name = `${auth.performer.slug}-收入明細-${y}${String(mo).padStart(2, "0")}.csv`;
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "no-store",
    },
  });
}
