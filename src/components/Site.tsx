import Link from "next/link";
import { APP_NAME } from "@/lib/env";
import { ACTS } from "@/lib/acts";
import { nt } from "@/lib/format";
import type { Card } from "@/lib/market";
import { PromoLink } from "./PromoLink";

export function SiteHeader() {
  return (
    <header className="row no-print">
      <div className="wrap flex h-16 items-center gap-6">
        <Link href="/" className="text-[19px] font-bold tracking-wide">{APP_NAME}</Link>
        <span className="flex-1" />
        <Link href="/me" className="hidden text-[15px] md:block">我的護照</Link>
        <Link href="/login" className="btn btn-secondary btn-sm">表演者登入</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-16 border-t border-rule">
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 pt-8 pb-4 text-[14px]">
        <Link href="/login">表演者登入</Link>
        <Link href="/me">我的護照</Link>
      </div>
      <div className="wrap pb-8 text-[13px] text-ink3">
        {APP_NAME}・星昊科技有限公司・款項由觀眾直接付給表演者，平台不經手
      </div>
    </footer>
  );
}

export function Photo({ src, ratio = "4 / 3", label = "尚未上傳照片", className = "" }: { src?: string | null; ratio?: string; label?: string; className?: string }) {
  return (
    <span className={`photo ${className}`} style={{ aspectRatio: ratio }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="p-2">{label}</span>}
    </span>
  );
}

/** 表演者列：搜尋結果、地區頁都用它 */
export function PerfRow({ c }: { c: Card }) {
  return (
    <div className="row grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 py-4 md:grid-cols-[160px_minmax(0,1fr)_auto] md:gap-6">
      <PromoLink promoId={c.promoId} href={`/u/${c.slug}`}>{<Photo src={c.cover ?? c.avatar} />}</PromoLink>
      <div className="min-w-0">
        {c.promoted && <div className="label mb-1">付費推薦</div>}
        <div className="flex flex-wrap items-center gap-2">
          <PromoLink promoId={c.promoId} href={`/u/${c.slug}`} className="h3">{c.name}</PromoLink>
          {c.live && <span className="tag tag-now"><span className="h-[7px] w-[7px] rounded-full bg-ink" />演出中</span>}
        </div>
        <div className="small">{c.actName}・{[c.city, c.district].filter(Boolean).join(" ")}{c.genres ? `・${c.genres}` : ""}</div>
        <div className="small text-ink3">平台紀錄 <span className="num font-semibold text-ink2">{c.shows}</span> 場・<span className="num font-semibold text-ink2">{c.followers}</span> 位粉絲{c.songs ? <>・歌單 <span className="num font-semibold text-ink2">{c.songs}</span> 首</> : null}</div>
        <div className="mt-2 flex items-center gap-3 md:hidden">
          {c.priceFrom != null && <span className="num text-[15px] font-bold">{nt(c.priceFrom)} 起</span>}
          {c.live ? <Link href={`/p/${c.slug}`} className="btn btn-now btn-sm">去點歌</Link> : c.bookable && <Link href={`/invite?to=${c.slug}`} className="btn btn-secondary btn-sm">邀請演出</Link>}
        </div>
      </div>
      <div className="hidden flex-col items-end gap-2 md:flex">
        {c.priceFrom != null && <span className="num text-[20px] font-bold">{nt(c.priceFrom)} <span className="small font-normal">起</span></span>}
        {c.live ? <Link href={`/p/${c.slug}`} className="btn btn-now btn-sm">去點歌</Link> : c.bookable && <Link href={`/invite?to=${c.slug}`} className="btn btn-secondary btn-sm">邀請演出</Link>}
      </div>
    </div>
  );
}

const WD = ["日", "一", "二", "三", "四", "五", "六"];

/** 活動列：店家／主辦刊登的演出 */
export function EventLine({ e }: { e: { id: string; title: string; city: string; place: string; startsAt: string; priceText: string; cover?: string | null; organizer: string; acts: { slug: string; name: string }[]; guestActs: string; promoted: boolean; promoId?: string | null } }) {
  const d = new Date(new Date(e.startsAt).getTime() + 8 * 3600_000);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  const who = [...e.acts.map((a) => a.name), e.guestActs].filter(Boolean).join("、");
  return (
    <PromoLink promoId={e.promoId ?? null} href={`/e/${e.id}`} className="row grid grid-cols-[52px_56px_minmax(0,1fr)_auto] items-center gap-3 py-4 md:grid-cols-[68px_88px_minmax(0,1fr)_200px] md:gap-6">
      <span className="flex flex-col"><span className="label">週{WD[d.getUTCDay()]}</span><strong className="num text-[34px] leading-9 font-extrabold md:text-[50px] md:leading-[50px]">{d.getUTCDate()}</strong></span>
      <Photo src={e.cover} ratio="1 / 1" label="" className="!rounded-[12px]" />
      <span className="min-w-0">
        {e.promoted && <span className="label block">付費推薦</span>}
        <span className="h3 block truncate">{e.title}</span>
        <span className="small block truncate">{who ? `${who}・` : ""}{e.organizer}</span>
      </span>
      <span className="small text-right md:text-left"><span className="num block text-[15px] font-semibold text-ink">{hm}</span>{[e.city, e.place].filter(Boolean).join("・")}{e.priceText ? `・${e.priceText}` : ""}</span>
    </PromoLink>
  );
}

/** 演出列：日期大字、名稱、時間地點 */
export function ShowRow({ s }: { s: { startsAt: string; location: string; note: string; slug: string; name: string; cover?: string | null; city?: { short: string } | null } }) {
  const d = new Date(new Date(s.startsAt).getTime() + 8 * 3600_000);
  const hm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return (
    <Link href={`/u/${s.slug}`} className="row grid grid-cols-[56px_56px_minmax(0,1fr)_auto] items-center gap-3 py-4 md:grid-cols-[72px_72px_minmax(0,1fr)_200px] md:gap-6">
      <span className="flex flex-col"><span className="label">週{WD[d.getUTCDay()]}</span><strong className="num text-[36px] leading-9 font-extrabold md:text-[52px] md:leading-[52px]">{d.getUTCDate()}</strong></span>
      <Photo src={s.cover} ratio="1 / 1" label="" className="!rounded-[12px]" />
      <span className="min-w-0"><span className="h3 block">{s.name}</span><span className="small block">{s.note || "現場演出"}</span></span>
      <span className="small text-right md:text-left"><span className="num block text-[15px] font-semibold text-ink">{hm}</span>{[s.city?.short, s.location].filter(Boolean).join("・")}</span>
    </Link>
  );
}
