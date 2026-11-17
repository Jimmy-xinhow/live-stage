import { auditLog } from "@/lib/audit";
import { Table, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

const ACTION: Record<string, string> = {
  suspend: "停用帳號", activate: "恢復帳號", adjust_points: "調整點數", refund: "退款",
  hide_review: "隱藏評價", unhide_review: "恢復評價", unpublish_event: "下架活動", publish_event: "恢復活動",
  handle_report: "處理檢舉",
};
const TARGET: Record<string, string> = { performer: "帳號", order: "訂單", event: "活動", review: "評價", report: "檢舉" };

export default async function Logs() {
  const list = await auditLog(200);
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="操作紀錄" desc="後台做過的每一個會改到資料的動作都留在這裡，只能新增不能修改。最近 200 筆。" />
      <Table
        head={["時間", "操作者", "動作", "對象", "名稱", "說明", "來源 IP"]}
        rows={list.map((l) => [
          <When key="w" v={l.createdAt.toISOString()} />,
          l.actor === "password" ? "密碼登入" : l.actor,
          ACTION[l.action] ?? l.action,
          TARGET[l.targetType] ?? l.targetType,
          <span key="n" className="block max-w-[200px] truncate">{l.targetName || "—"}</span>,
          <span key="d" className="block max-w-[260px] truncate">{l.detail || "—"}</span>,
          <span key="i" className="small num">{l.ip || "—"}</span>,
        ])}
        empty="還沒有任何後台操作。"
      />
    </div>
  );
}
