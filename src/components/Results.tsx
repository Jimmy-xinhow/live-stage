import Link from "next/link";
import { searchPerformers, actCounts } from "@/lib/market";
import { ACTS, actBySlug } from "@/lib/acts";
import { AREAS, areaBySlug } from "@/lib/areas";
import { nt } from "@/lib/format";
import { EventLine, PerfRow } from "./Site";
import { upcomingEvents } from "@/lib/events";

/** 搜尋結果與「縣市×類型」收錄頁共用 */
export async function Results({ city, act, q, live, base }: { city?: string; act?: string; q?: string; live?: boolean; base: (f: { city?: string; act?: string }) => string }) {
  const area = areaBySlug(city);
  const a = actBySlug(act);
  const [list, counts, events] = await Promise.all([searchPerformers({ city, act, q, live }), actCounts(city), city && !q ? upcomingEvents({ city, limit: 5, slot: "event_top" }) : Promise.resolve([])]);
  const prices = list.map((c) => c.priceFrom).filter((x): x is number => x != null);
  const liveN = list.filter((c) => c.live).length;
  const title = live ? "現在演出中" : `${area?.short ?? ""}${a?.name ?? "表演者"}`;
  return (
    <main className="wrap pb-10">
      <nav aria-label="麵包屑" className="small flex flex-wrap gap-1.5 py-4 text-ink3">
        <Link href="/">首頁</Link><span>›</span>{area ? <><Link href={`/area/${area.slug}`}>{area.name}</Link>{a && <><span>›</span><span>{a.name}</span></>}</> : <span>找表演</span>}
      </nav>
      <h1 className="h1">{title}{q ? `：「${q}」` : ""}</h1>
      <p className="small mt-1">
        <span className="num font-semibold text-ink">{list.length}</span> 位{liveN > 0 && <>・<span className="font-medium text-nowtext">{liveN} 位演出中</span></>}
        {prices.length > 0 && <>・公開起價 {nt(Math.min(...prices))}{Math.max(...prices) > Math.min(...prices) ? `–${Math.max(...prices).toLocaleString("zh-TW")}` : ""}</>}
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={base({ city })} className={`tag h-9 px-3.5 text-[14px] ${!act ? "bg-ink text-paper" : "tag-quiet"}`}>全部</Link>
        {ACTS.filter((x) => counts[x.slug] || x.slug === act).map((x) => (
          <Link key={x.slug} href={base({ city, act: x.slug })} className={`tag h-9 px-3.5 text-[14px] ${act === x.slug ? "bg-ink text-paper" : "tag-quiet"}`}>{x.name} <span className="num">{counts[x.slug] ?? 0}</span></Link>
        ))}
      </div>

      <div className="mt-6 border-t-2 border-ink">
        {list.length ? list.map((c) => <PerfRow key={c.slug} c={c} />) : (
          <div className="py-10"><p className="h3">這裡還沒有{a?.name ?? "表演者"}</p><p className="small mt-1">換個類型或地區看看，或直接送出邀約，有符合的表演者加入時會收到。</p></div>
        )}
      </div>

      {!live && (
        <Link href={`/invite?${new URLSearchParams({ ...(city ? { city } : {}), ...(act ? { act } : {}) })}`} className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
          <span><strong className="h3 block">不想一個一個問？</strong><span className="small">填一次需求，同時送給最多 5 位符合條件的表演者，報價傳到你的 LINE。</span></span>
          <span className="btn btn-primary">免費送出邀約</span>
        </Link>
      )}

      {events.length > 0 && (
        <section className="sec mt-10">
          <div className="mb-1 flex items-baseline justify-between"><h2 className="h2">{area?.short}近期演出活動</h2><Link href={`/events?city=${area?.slug}`} className="underline">看全部</Link></div>
          {events.map((e) => <EventLine key={e.id} e={e} />)}
        </section>
      )}

      {area && (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div><h2 className="label mb-2">同區域其他縣市</h2><div className="flex flex-wrap gap-x-5 gap-y-1">{AREAS.filter((x) => x.region === area.region && x.slug !== area.slug).map((x) => <Link key={x.slug} href={base({ city: x.slug, act })} className="underline">{x.short}{a?.name ?? ""}</Link>)}</div></div>
          {a && <div><h2 className="label mb-2">{area.short}的其他表演</h2><div className="flex flex-wrap gap-x-5 gap-y-1">{ACTS.filter((x) => x.slug !== a.slug && counts[x.slug]).map((x) => <Link key={x.slug} href={base({ city, act: x.slug })} className="underline">{area.short}{x.name}</Link>)}</div></div>}
        </div>
      )}
    </main>
  );
}
