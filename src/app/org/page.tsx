import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { eventStats, fmtWhen, myEvents } from "@/lib/events";
import { Empty, PageHead, Section } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

export default async function OrgHome() {
  const { performer: p } = (await requireAccount())!;
  const [list, stats] = await Promise.all([myEvents(p.id), eventStats(p.id)]);
  const soon = list.filter((e) => e.status === "published" && new Date(e.startsAt).getTime() > Date.now()).slice(0, 5);
  const needSetup = !p.city || !p.bio;
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="總覽" desc={<>刊登演出活動、標記平台上的表演者、用點數買活動曝光。平台不抽成，也不經手門票或演出費。</>} />

      {needSetup && (
        <Link href="/org/profile" className="rounded-[12px] border-[1.5px] border-ink px-4 py-3 text-[14px]">
          先把場地資料填好（縣市、地址、介紹），活動頁才會顯示完整資訊。
        </Link>
      )}

      <section className="sec">
        <h2 className="h2">活動</h2>
        <div className="mt-3 grid grid-cols-2 border-y border-rule">
          <div className="flex flex-col py-4"><span className="label">已刊登</span><strong className="num text-[28px] leading-10">{stats.total}</strong></div>
          <div className="flex flex-col border-l border-rule py-4 pl-4"><span className="label">即將舉行</span><strong className="num text-[28px] leading-10">{stats.upcoming}</strong></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/org/events" className="btn btn-primary btn-sm">刊登新活動</Link>
          <Link href="/org/promote" className="btn btn-secondary btn-sm">買活動曝光</Link>
          <Link href="/invite" className="btn btn-secondary btn-sm">找表演者來演出</Link>
        </div>
      </section>

      <section className="sec">
        <h2 className="h2">接下來的活動</h2>
        <div className="mt-1 border-t border-rule">
          {soon.length ? soon.map((e) => (
            <Link key={e.id} href={`/e/${e.id}`} className="row flex min-h-[64px] items-center gap-3 py-3">
              <span className="min-w-0 flex-1"><strong className="block truncate">{e.title}</strong><span className="small">{fmtWhen(new Date(e.startsAt))}・{e.place}</span></span>
              <span className="small shrink-0">{e.tags.filter((t) => t.status === "confirmed").length ? `${e.tags.filter((t) => t.status === "confirmed").length} 位已確認` : e.tags.length ? "等表演者確認" : "未標記表演者"}</span>
            </Link>
          )) : <p className="small py-3">還沒有活動。刊登後會出現在首頁、縣市頁與表演者粉絲的通知裡。</p>}
        </div>
      </section>
    </div>
  );
}
