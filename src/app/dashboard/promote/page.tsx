import Link from "next/link";
import { requirePerformer } from "@/lib/auth";
import { myPromotions, promotionStats, PROMO } from "@/lib/market";
import { fmtPoints } from "@/lib/billing";
import { areaBySlug } from "@/lib/areas";
import { actName } from "@/lib/acts";
import { PromoteForm } from "./PromoteForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requirePerformer();
  if (!auth) return null;
  const p = auth.performer;
  const list = await myPromotions(p.id);
  const stats = await promotionStats(list);
  const area = areaBySlug(p.city);
  const fmt = (d: Date) => d.toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" });
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="h1">曝光推廣</h1><p className="small">要不要買、買多久都由你決定。所有推薦位在前台都會標示「付費推薦」，不保證邀約數量。點數餘額 <span className="num font-semibold text-ink">{fmtPoints(p.pointsCents)}</span> 點・<Link href="/dashboard/points" className="underline">加購</Link></p></div>
      {area ? <PromoteForm where={`${area.short}・${actName(p.actType)}`} slots={Object.entries(PROMO).map(([id, s]) => ({ id, name: s.name, daily: s.daily, cap: s.cap }))} /> : <p className="sec">請先到「設定」選擇演出縣市，才能購買版位。</p>}
      <section className="sec">
        <h2 className="h2">刊登與成效</h2>
        <p className="small">曝光＝版位被看到的次數，點擊＝有人從版位點進你的作品頁。追蹤與邀約是刊登期間新增的，不代表都來自這個版位。</p>
        <div className="mt-2 border-t border-rule">
          {list.length ? list.map((x) => {
            const st = stats.find((s) => s.id === x.id);
            const live = x.endsAt.getTime() > Date.now();
            return (
              <div key={x.id} className="row flex flex-col gap-2 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{PROMO[x.slot as keyof typeof PROMO]?.name ?? x.slot}</strong>
                  {live ? <span className="tag tag-now">刊登中</span> : <span className="tag tag-quiet">已結束</span>}
                  <span className="small">{areaBySlug(x.city)?.short}・{actName(x.actType)}・{fmt(x.startsAt)}–{fmt(x.endsAt)}</span>
                  <span className="small num ml-auto">{fmtPoints(x.costCents)} 點</span>
                </div>
                <div className="grid grid-cols-4 gap-3 border-t border-rule pt-2">
                  {[["曝光", x.impressions], ["點擊", x.clicks], ["新增追蹤", st?.follows ?? 0], ["收到邀約", st?.inquiries ?? 0]].map(([l, v]) => (
                    <div key={l as string}><span className="label">{l}</span><strong className="num block text-[20px] leading-7">{Number(v).toLocaleString("zh-TW")}</strong></div>
                  ))}
                </div>
              </div>
            );
          }) : <p className="small py-3">還沒有購買紀錄。</p>}
        </div>
      </section>
    </div>
  );
}
