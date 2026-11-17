import Link from "next/link";
import { reportsData } from "@/lib/admin";
import { State, Table, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";
import { ReportActions } from "../ReportActions";

export const dynamic = "force-dynamic";

const REASON: Record<string, string> = { spam: "洗版廣告", abuse: "謾罵攻擊", sexual: "色情", fake: "不實資訊", other: "其他" };
const TYPE: Record<string, string> = { order: "留言牆", performer: "表演者頁", event: "活動頁", chat: "聊天室" };
const TABS = [["new", "待處理"], ["reviewed", "已處理"], ["dismissed", "不成立"], ["", "全部"]] as const;

export default async function Reports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "new";
  const list = await reportsData(status);
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="內容檢舉" desc="觀眾檢舉的留言、活動與表演者頁。處理方式是到對應的頁面隱藏留言、下架活動或停用帳號，再回來標記。" />
      <div className="flex flex-wrap gap-2">
        {TABS.map(([v, l]) => (
          <Link key={v} href={v ? `/admin/reports?status=${v}` : "/admin/reports?status="} className={`tag !h-9 !px-3 !text-[14px] ${status === v ? "!bg-ink !text-paper" : "tag-quiet"}`}>{l}</Link>
        ))}
      </div>
      <Table
        head={["時間", "位置", "原因", "內容", "檢舉人", "狀態", ""]}
        rows={list.map((r) => [
          <When key="w" v={r.at} />,
          TYPE[r.targetType] ?? r.targetType,
          REASON[r.reason] ?? r.reason,
          <span key="l" className="block max-w-[320px] truncate">{r.href ? <Link href={r.href} target="_blank" className="underline">{r.label}</Link> : r.label}{r.note ? <span className="small">・{r.note}</span> : null}</span>,
          r.by,
          <State key="s" kind={r.status === "new" ? "warn" : r.status === "reviewed" ? "ok" : "idle"}>{r.status === "new" ? "待處理" : r.status === "reviewed" ? "已處理" : "不成立"}</State>,
          r.status === "new" ? <ReportActions key="a" id={r.id} /> : null,
        ])}
        empty={status === "new" ? "沒有待處理的檢舉。" : "沒有資料。"}
      />
    </div>
  );
}
