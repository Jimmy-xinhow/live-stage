import Link from "next/link";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { requireAccount } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { planIsPaid } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";
import { PageHead } from "@/components/back/Shell";
import { MonthPicker } from "./MonthPicker";

export const dynamic = "force-dynamic";

const nt = (n: number) => `NT$${n.toLocaleString()}`;
const tpe = (d: Date) =>
  new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/** 台北時間的「現在是哪個月」 */
function thisMonth() {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).format(new Date());
  return s.slice(0, 7);
}

export default async function Ledger({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { performer: p } = (await requireAccount())!;
  const paid = planIsPaid(effectivePlan(p));
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : thisMonth();

  if (!paid)
    return (
      <div className="flex max-w-[620px] flex-col gap-5">
        <PageHead title="收入對帳" desc="每個月的收款明細，可以匯出成試算表，用來報稅或跟店家核對。" />
        <div className="card p-5">
          <p className="leading-7">
            這是<strong>點歌台方案</strong>以上的功能。匯出的檔案一筆一行，含付款時間、訂單編號、品項、金額、服務費、實收，
            最後一列是當月合計——直接丟進 Excel 或拿給記帳的人就能用。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/plan" className="btn btn-now">看方案</Link>
            <Link href="/pricing" className="btn btn-secondary">方案包含什麼</Link>
          </div>
        </div>
      </div>
    );

  const [y, mo] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, mo - 1, 1, -8));
  const to = new Date(Date.UTC(y, mo, 1, -8));

  const db = await getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.performerId, p.id), inArray(orders.status, ["paid", "refunded"]), gte(orders.paidAt, from), lt(orders.paidAt, to)))
    .orderBy(desc(orders.paidAt))
    .limit(300);

  const live = rows.filter((o) => o.status !== "refunded");
  const gross = live.reduce((n, o) => n + o.amount, 0);
  const fee = live.reduce((n, o) => n + o.feeCents, 0) / 100;
  const refunds = rows.length - live.length;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageHead title="收入對帳" desc="每個月的收款明細。匯出的 CSV 可以直接丟進 Excel 或拿給記帳的人，最後一列有合計。" />
        <div className="flex flex-wrap items-end gap-4">
          <MonthPicker month={month} />
          <a href={`/api/dashboard/ledger?month=${month}`} className="btn btn-now">匯出這個月的 CSV</a>
        </div>
      </section>

      <section className="sec">
        <h2 className="h2">{month.replace("-", " 年 ")} 月</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="card p-5">
            <div className="small">收款金額</div>
            <strong className="num h2">{nt(gross)}</strong>
            <div className="small mt-1">{live.length} 筆{refunds > 0 && `・另有 ${refunds} 筆退款`}</div>
          </div>
          <div className="card p-5">
            <div className="small">平台服務費</div>
            <strong className="num h2">{nt(Math.round(fee))}</strong>
            <div className="small mt-1">從點數扣，不是從收款扣</div>
          </div>
          <div className="card p-5">
            <div className="small">實收</div>
            <strong className="num h2">{nt(Math.round(gross - fee))}</strong>
            <div className="small mt-1">款項直接進你的帳戶</div>
          </div>
        </div>
      </section>

      <section className="sec">
        <h2 className="h2">明細</h2>
        {rows.length === 0 ? (
          <p className="small mt-3">這個月還沒有收款紀錄。</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>時間</th><th>項目</th><th>點歌人</th>
                  <th className="text-right">金額</th><th className="text-right">服務費</th><th className="text-right">實收</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const r = o.status === "refunded";
                  const f = r ? 0 : o.feeCents / 100;
                  return (
                    <tr key={o.id} className={r ? "opacity-55" : ""}>
                      <td className="num whitespace-nowrap">{o.paidAt ? tpe(o.paidAt) : ""}</td>
                      <td>{o.itemTitle ?? (o.kind === "tip" ? "打賞" : "點歌")}</td>
                      <td>{o.isAnonymous ? "匿名" : o.nickname || "—"}</td>
                      <td className="num text-right whitespace-nowrap">{r ? `-${o.amount.toLocaleString()}` : o.amount.toLocaleString()}</td>
                      <td className="num text-right whitespace-nowrap">{Math.round(f).toLocaleString()}</td>
                      <td className="num text-right whitespace-nowrap">{r ? 0 : Math.round(o.amount - f).toLocaleString()}</td>
                      <td className="whitespace-nowrap">{r ? <span className="tag tag-quiet">已退款</span> : <span className="tag">已付款</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length >= 300 && <p className="small mt-3">畫面只列最近 300 筆，匯出的 CSV 是完整的。</p>}
          </div>
        )}
      </section>
    </div>
  );
}
