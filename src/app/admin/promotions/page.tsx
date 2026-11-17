import { promotionsData } from "@/lib/admin";
import { Pts, Table, Tag, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";
const SLOT: Record<string, string> = { search: "搜尋置頂", home: "首頁推薦", event_top: "活動列表置頂", event_home: "首頁活動推薦" };

export default async function Promotions() {
  if (!FEATURES.promote) notFound();
  const list = await promotionsData();
  const live = list.filter((p) => new Date(p.endsAt).getTime() > Date.now());
  const pts = list.reduce((a, p) => a + p.cost, 0);
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="曝光版位" desc={<>刊登中 {live.length} 筆、累計收入 <span className="num font-semibold text-ink">{pts} 點</span>。曝光＝版位被看到的次數，點擊＝從版位點進去的次數。</>} />
      <Table
        head={["期間", "買的人", "版位", "對象", "地區", "費用", "曝光", "點擊", "點擊率", "狀態"]}
          right={[5,6,7,8]}
        rows={list.map((p) => {
          const ctr = p.impressions ? `${((p.clicks / p.impressions) * 100).toFixed(1)}%` : "—";
          const on = new Date(p.endsAt).getTime() > Date.now();
          return [
            <span key="w" className="small num whitespace-nowrap"><When v={p.startsAt} /></span>,
            p.buyer,
            SLOT[p.slot] ?? p.slot,
            <span key="t" className="truncate">{p.target}</span>,
            `${p.city}${p.act === "活動" ? "" : `・${p.act}`}`,
            <Pts key="c" v={p.cost} />,
            <span key="i" className="num">{p.impressions.toLocaleString("zh-TW")}</span>,
            <span key="k" className="num">{p.clicks}</span>,
            <span key="r" className="num">{ctr}</span>,
            on ? <Tag on>刊登中</Tag> : <Tag>已結束</Tag>,
          ];
        })}
        empty="還沒有人買版位。"
      />
    </div>
  );
}
