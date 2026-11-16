import { accounts } from "@/lib/admin";
import { AccountActions } from "../AccountActions";
import { Money, Out, Table, Tag, When } from "../Bits";

export const dynamic = "force-dynamic";

export default async function Performers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const list = await accounts("performer", q);
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="h1">表演者</h1><p className="small">共 {list.length} 位{q ? `（搜尋：${q}）` : ""}。停用後作品頁與點歌頁會下架，資料保留。</p></div>
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="搜尋名稱或網址代號" className="input max-w-[320px]" /><button className="btn btn-secondary">搜尋</button></form>
      <Table
        head={["名稱", "類型", "縣市", "點數", "場次", "累計成交", "粉絲", "加入", "狀態", ""]}
        rows={list.map((p) => [
          <span key="n" className="flex items-center gap-2 whitespace-nowrap"><Out href={`/u/${p.slug}`}>{p.name}</Out>{p.live && <Tag on>演出中</Tag>}</span>,
          p.act,
          p.city,
          <span key="pt" className="num">{p.points}</span>,
          <span key="s" className="num">{p.shows}</span>,
          <Money key="g" v={p.gmv} />,
          <span key="f" className="num">{p.fans}</span>,
          <When key="c" v={p.createdAt} />,
          p.status === "active" ? "啟用中" : <span className="text-err">已停用</span>,
          <AccountActions key="a" id={p.id} name={p.name} status={p.status} />,
        ])}
      />
    </div>
  );
}
