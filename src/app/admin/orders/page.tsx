import Link from "next/link";
import { recentOrders } from "@/lib/admin";
import { Code, Money, Out, State, Table, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";
const STATUS: Record<string, string> = { paid: "已付款", awaiting: "待確認轉帳", pending: "等待金流", failed: "失敗", expired: "逾時" };
const QUEUE: Record<string, string> = { waiting: "排隊中", playing: "正在唱", done: "已唱", skipped: "跳過" };
const TABS = [["", "全部"], ["paid", "已付款"], ["awaiting", "待確認"], ["failed", "失敗"]] as const;

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "";
  const list = await recentOrders(status);
  const sum = list.filter((o) => o.status === "paid").reduce((a, o) => a + o.amount, 0);
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="交易" desc={<>最近 100 筆。款項直接進表演者的帳戶，平台只記錄並扣服務費點數。本頁已付款合計 <span className="num font-semibold text-ink">NT${sum.toLocaleString()}</span>。</>} />
      <div className="flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <Link key={v} href={v ? `/admin/orders?status=${v}` : "/admin/orders"} className={`tag !h-9 !px-3 !text-[14px] ${status === v ? "!bg-ink !text-paper" : "tag-quiet"}`}>{l}</Link>
        ))}
      </div>
      <Table
        head={["時間", "表演者", "項目", "金額", "服務費", "付款方式", "狀態", "訂單號"]}
          right={[3,4]}
        rows={list.map((o) => [
          <When key="w" v={o.at} />,
          <Out key="p" href={`/u/${o.slug}`}>{o.performer}</Out>,
          <span key="i">{o.game ? "遊戲加成" : o.item ? `〈${o.item}〉` : "打賞"}{o.queue ? <span className="small">・{QUEUE[o.queue] ?? o.queue}</span> : null}</span>,
          <Money key="a" v={o.amount} />,
          <span key="f" className="num">{o.fee}</span>,
          o.payMode === "manual" ? "收款碼" : "刷卡",
          <State key="s" kind={o.status === "paid" ? "ok" : o.status === "failed" || o.status === "expired" ? "bad" : "warn"}>{STATUS[o.status] ?? o.status}</State>,
          <Code key="t" v={o.tradeNo} />,
        ])}
        empty="還沒有交易。"
      />
    </div>
  );
}
