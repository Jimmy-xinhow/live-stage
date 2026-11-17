import { IconPlus } from "@/components/icons";
import Link from "next/link";

/** 手機外框：真實產品截圖放進去，讓人一眼知道這是手機上的畫面 */
export function Phone({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
 return (
 <span className={`relative inline-block ${className}`}>
 <span className="block overflow-hidden rounded-[32px] border-[6px] border-ink bg-ink shadow-[0_18px_40px_-12px_rgba(21,20,18,.45)]">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={src} alt={alt} className="block w-full" loading="lazy" />
 </span>
 </span>
 );
}

/** 桌機／大螢幕外框 */
export function Screen({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
 return (
 <span className={`block ${className}`}>
 <span className="block overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-ink shadow-[0_18px_40px_-16px_rgba(21,20,18,.4)]">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={src} alt={alt} className="block w-full" loading="lazy" />
 </span>
 </span>
 );
}

/** 區塊標題：小標籤＋大標＋說明 */
export function Head({ eyebrow, title, desc, id }: { eyebrow?: string; title: string; desc?: string; id?: string }) {
 return (
 <div className="mb-8 max-w-[680px]">
 {eyebrow && <span className="label">{eyebrow}</span>}
 <h2 id={id} className="mt-2 d3 leading-tight font-extrabold tracking-tight">{title}</h2>
 {desc && <p className="mt-3 leading-8 text-ink2">{desc}</p>}
 </div>
 );
}

/** 轉換區：主要行動＋次要行動＋一句放心的話 */
export function Cta({ note, primary = "免費建立我的點歌頁", secondary }: { note?: string; primary?: string; secondary?: { href: string; label: string } }) {
 return (
 <div className="flex flex-col gap-3">
 <div className="flex flex-wrap items-center gap-3">
 <Link href="/login" className="btn btn-primary btn-lg">{primary}</Link>
 {secondary && <Link href={secondary.href} className="btn btn-secondary btn-lg">{secondary.label}</Link>}
 </div>
 {note && <p className="small">{note}</p>}
 </div>
 );
}

/** 常見問題：純 HTML details，不需要 JS */
export function Faq({ items, dark = false }: { items: { q: string; a: React.ReactNode }[]; dark?: boolean }) {
 return (
 <div className={dark ? "border-t border-[color:var(--line)]" : "border-t-2 border-ink"}>
 {items.map((it, i) => (
 <details key={i} className={`group py-4 ${dark ? "border-b border-[color:var(--line)]" : "row"}`}>
 <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 t2 font-bold transition-colors hover:text-[color:var(--sodium)]">
 {it.q}
 <IconPlus size={20} className={`shrink-0 transition-transform duration-200 group-open:rotate-45 ${dark ? "text-[color:var(--dim)]" : "text-ink3"}`} />
 </summary>
 <div className={`mt-3 max-w-[640px] leading-8 ${dark ? "text-[color:var(--dim)]" : "text-ink2"}`}>{it.a}</div>
 </details>
 ))}
 </div>
 );
}
