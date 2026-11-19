import Link from "next/link";
import { dailyRevenue, overview } from "@/lib/admin";
import { nt } from "@/lib/format";
import { env } from "@/lib/env";
import { Stats } from "./Bits";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [o, daily] = await Promise.all([overview(), dailyRevenue(14)]);
  const max = Math.max(1, ...daily.map((d) => d.sum));
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="總覽" desc={<>成交金額是表演者收到的錢（平台不經手）；平台收入＝成交服務費點數＋表演者購點。</>} />

      <section className="sec">
        <h2 className="h2">成交</h2>
        <Stats
          items={[
            { label: "今天", value: nt(o.gmv.d1) },
            { label: "近 7 天", value: nt(o.gmv.d7) },
            { label: "近 30 天", value: nt(o.gmv.d30), sub: `${o.orders30} 筆` },
            { label: "待確認轉帳", value: o.awaiting, sub: "免申請模式" },
          ]}
        />
        {daily.length > 0 && (
          <div className="mt-4">
            <span className="label">近 14 天</span>
            <div className="mt-2 flex h-24 items-end gap-1.5 border-b border-rule pb-1">
              {daily.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}・${nt(d.sum)}・${d.cnt} 筆`}>
                  <div className="w-full max-w-[48px] rounded-t-[4px] bg-ink" style={{ height: `${d.sum ? Math.max(4, (d.sum / max) * 76) : 2}px`, opacity: d.sum ? 1 : 0.25 }} />
                  <span className="num text-[10px] text-ink3">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="sec">
        <h2 className="h2">平台收入（近 30 天）</h2>
        <Stats
          items={[
            { label: "服務費", value: `${o.fee30 / 100} 點`, sub: `免費方案每筆 ${env.billing.feeRate * 100}%` },
            { label: "購買點數", value: nt(o.points.nt30), sub: `${o.points.cnt30} 筆` },
          ]}
        />
      </section>

      <section className="sec">
        <h2 className="h2">使用狀況</h2>
        <Stats
          items={[
            { label: "表演者", value: o.accounts.performers, sub: `30 天新增 ${o.accounts.new30}・停用 ${o.accounts.suspended}` },
            { label: "正在演出", value: o.liveNow },
            { label: "觀眾", value: o.fans.total, sub: `30 天新增 ${o.fans.new30}` },
            { label: "待確認收款", value: o.awaiting },
          ]}
        />
      </section>

      <section className="sec">
        <h2 className="h2">快速前往</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/orders?status=awaiting" className="btn btn-secondary btn-sm">待確認的轉帳</Link>
          <Link href="/admin/reports?status=new" className="btn btn-secondary btn-sm">待處理檢舉</Link>
          <Link href="/admin/logs" className="btn btn-secondary btn-sm">操作紀錄</Link>
          <Link href="/admin/system" className="btn btn-secondary btn-sm">系統設定</Link>
        </div>
      </section>
    </div>
  );
}
