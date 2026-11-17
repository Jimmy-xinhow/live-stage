import { eventsData } from "@/lib/admin";
import { EventActions } from "./EventActions";
import { Out, Table, Tag, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function AdminEvents() {
  if (!FEATURES.events) notFound();
  const list = await eventsData();
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="活動" desc={<>違反刊登規範可以下架。下架後活動頁標示已取消，也不再出現在列表、地圖與 sitemap。</>} />
      <Table
        head={["活動", "主辦", "時間", "地點", "演出者", "狀態", ""]}
        rows={list.map((e) => [
          <Out key="t" href={`/e/${e.id}`}>{e.title}</Out>,
          e.organizer,
          <When key="w" v={e.startsAt} />,
          `${e.city} ${e.place}`,
          e.acts.length ? e.acts.join("、") : <span className="small">未標記</span>,
          e.status === "published" ? <Tag on>刊登中</Tag> : <Tag>已下架</Tag>,
          <EventActions key="a" id={e.id} title={e.title} status={e.status} />,
        ])}
        empty="還沒有活動。"
      />
    </div>
  );
}
