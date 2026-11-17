import { accounts } from "@/lib/admin";
import { AccountActions } from "../AccountActions";
import { Table, When, Who } from "../Bits";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { venue: "餐廳酒吧展演", organizer: "活動主辦", brand: "品牌企業", other: "其他" };

export default async function Organizers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const list = await accounts("organizer", q);
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="店家與主辦" desc={<>共 {list.length} 個帳號。他們只能刊登活動與買活動曝光，不會出現在表演者的搜尋結果。</>} />
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="搜尋名稱或網址代號" className="input max-w-[320px]" /><button className="btn btn-secondary">搜尋</button></form>
      <Table
        head={["名稱", "類型", "縣市", "點數", "活動數", "加入", "狀態", ""]}
        right={[3, 4]}
        rows={list.map((p) => [
          <Who key="n" src={p.avatar} name={p.name} />,
          KIND[p.act] ?? p.act,
          p.city,
          <span key="pt" className="num">{p.points}</span>,
          <span key="e" className="num">{p.events}</span>,
          <When key="c" v={p.createdAt} />,
          p.status === "active" ? "啟用中" : <span className="text-err">已停用</span>,
          <AccountActions key="a" id={p.id} name={p.name} status={p.status} />,
        ])}
        empty="還沒有店家或主辦帳號。"
      />
    </div>
  );
}
