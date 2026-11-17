import { pointsData } from "@/lib/admin";
import { Code, Money, Pts, Table, Tag, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";
const REASON: Record<string, string> = {
  signup_bonus: "新手贈點", purchase: "儲值", fee: "服務費", live_notify: "開演通知", broadcast: "粉絲訊息",
  adjust: "平台調整", promo: "曝光版位", event_promo: "活動曝光", event_notify: "活動通知",
};

export default async function Points() {
  const { buys, ledger } = await pointsData();
  const paid = buys.filter((b) => b.status === "paid");
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="點數" desc={<>1 點 = NT$1。購點金額進平台帳戶，成交服務費與版位費在這裡扣。已付款購點合計 <span className="num font-semibold text-ink">NT${paid.reduce((a, b) => a + b.nt, 0).toLocaleString()}</span>。</>} />

      <section className="sec">
        <h2 className="h2">購點紀錄</h2>
        <Table
          head={["時間", "帳號", "金額", "點數", "狀態", "訂單號"]}
          right={[2,3]}
          rows={buys.map((b) => [
            <When key="w" v={b.at} />, b.name, <Money key="m" v={b.nt} />, <Pts key="p" v={b.points} />,
            b.status === "paid" ? <Tag on>已付款</Tag> : <Tag>{b.status === "pending" ? "等待付款" : "失敗"}</Tag>,
            <Code key="t" v={b.tradeNo} />,
          ])}
          empty="還沒有人買點數。"
        />
      </section>

      <section className="sec">
        <h2 className="h2">點數異動</h2>
        <Table
          head={["時間", "帳號", "項目", "增減", "餘額", "備註"]}
          right={[3,4]}
          rows={ledger.map((l) => [
            <When key="w" v={l.at} />, l.name, REASON[l.reason] ?? l.reason,
            <span key="d" className={`num ${l.delta < 0 ? "" : "text-ok"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</span>,
            <span key="b" className="num">{l.balance}</span>,
            <span key="n" className="small">{l.note}</span>,
          ])}
          empty="還沒有異動。"
        />
      </section>
    </div>
  );
}
