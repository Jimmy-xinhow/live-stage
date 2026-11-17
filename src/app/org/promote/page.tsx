import { requireAccount } from "@/lib/auth";
import { EVENT_PROMO, eventPromotions, myEvents } from "@/lib/events";
import { fmtPoints } from "@/lib/billing";
import { EventPromoteForm } from "./EventPromoteForm";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";
const day = (iso: string) => new Date(iso).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" });

export default async function OrgPromote() {
  const { performer: p } = (await requireAccount())!;
  const [list, promos] = await Promise.all([myEvents(p.id), eventPromotions(p.id)]);
  const upcoming = list.filter((e) => e.status === "published" && new Date(e.startsAt).getTime() > Date.now());
  const now = Date.now();
  return (
    <div className="flex flex-col gap-8">
      <PageHead
        title="活動曝光"
        desc={<>用點數把活動推到列表最上面或首頁。每個地區的版位有限，一律標示「付費推薦」，不保證到場人數。餘額 <span className="num font-semibold text-ink">{fmtPoints(p.pointsCents)}</span> 點。</>}
      />

      <EventPromoteForm
        events={upcoming.map((e) => ({ id: e.id, title: e.title }))}
        slots={Object.entries(EVENT_PROMO).map(([id, s]) => ({ id, name: s.name, daily: s.daily, cap: s.cap }))}
      />

      <section className="sec">
        <h2 className="h2">刊登與成效</h2>
        <p className="small">曝光＝版位被看到的次數，點擊＝有人從版位點進活動頁。</p>
        <div className="mt-2 border-t border-rule">
          {promos.length ? promos.map((r) => {
            const live = new Date(r.endsAt).getTime() > now;
            return (
              <div key={r.id} className="row flex flex-col gap-2 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{EVENT_PROMO[r.slot as keyof typeof EVENT_PROMO]?.name ?? r.slot}</strong>
                  {live ? <span className="tag tag-now">刊登中</span> : <span className="tag tag-quiet">已結束</span>}
                  <span className="small truncate">{r.title}・{day(r.startsAt)}–{day(r.endsAt)}</span>
                  <span className="small num ml-auto">{fmtPoints(r.costCents)} 點</span>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-rule pt-2 sm:grid-cols-4">
                  {[["曝光", r.impressions], ["點擊", r.clicks]].map(([l, v]) => (
                    <div key={l as string}><span className="label">{l}</span><strong className="num block text-[20px] leading-7">{Number(v).toLocaleString("zh-TW")}</strong></div>
                  ))}
                </div>
              </div>
            );
          }) : <p className="small py-3">還沒有買過版位。</p>}
        </div>
      </section>
    </div>
  );
}
