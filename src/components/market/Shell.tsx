import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Wordmark } from "@/components/Wordmark";

/** 行銷頁的頁首。產品後台不吃這個，那邊維持紙本質感 */
export function StageHeader() {
 return (
 <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--night)]/85 backdrop-blur">
 <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-7 px-5">
 <Link href="/" aria-label={BRAND.name} className="inline-flex min-h-[44px] items-center"><Wordmark /></Link>
 <nav className="hidden items-center gap-6 text-[color:var(--dim)] md:flex">
 <Link href="/for/street" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">街頭</Link>
 <Link href="/for/venue" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">駐唱與樂團</Link>
 <Link href="/for/streamer" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">直播</Link>
 <Link href="/pricing" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">方案</Link>
 </nav>
 <span className="flex-1" />
 <Link href="/p/demo" className="hidden min-h-[44px] items-center text-[color:var(--dim)] transition-colors hover:text-[color:var(--bone)] md:inline-flex">看示範</Link>
 <Link href="/login" className="sbtn sbtn-main !h-11 !px-5">免費建立</Link>
 </div>
 </header>
 );
}

export function StageFooter() {
 return (
 <footer className="rule mt-6">
 <div className="mx-auto max-w-[1180px] px-5 py-12">
 <div className="flex flex-wrap gap-x-7 gap-y-3 text-[color:var(--dim)]">
 <Link href="/for/street" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">給街頭藝人</Link>
 <Link href="/for/venue" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">給駐唱與樂團</Link>
 <Link href="/for/streamer" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">給直播主</Link>
 <Link href="/pricing" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">方案與費用</Link>
 <Link href="/p/demo" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">看示範頁</Link>
 <Link href="/login" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">登入</Link>
 <Link href="/me" className="inline-flex min-h-[44px] items-center transition-colors hover:text-[color:var(--bone)]">我的護照</Link>
 </div>
 <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-[color:var(--line)] pt-5 text-[color:var(--dim)]">
 <Link href="/terms" className="inline-flex min-h-[44px] items-center cap transition-colors hover:text-[color:var(--bone)]">服務條款</Link>
 <Link href="/privacy" className="inline-flex min-h-[44px] items-center cap transition-colors hover:text-[color:var(--bone)]">隱私權政策</Link>
 <Link href="/refund" className="inline-flex min-h-[44px] items-center cap transition-colors hover:text-[color:var(--bone)]">退款與爭議</Link>
 </div>
 <p className="mt-5 cap text-[color:var(--dim)]">
 {BRAND.name}　{BRAND.legal}　款項由聽眾直接付給表演者，平台不經手
 </p>
 </div>
 </footer>
 );
}

/** 行銷頁的區塊容器：lx／lc 決定這一段被哪一道燈打到 */
export function Band({
 children, light, id, className = "",
}: { children: React.ReactNode; light?: "sodium" | "wash" | "haze"; id?: string; className?: string }) {
 const lit = light === "wash" ? "lit lit-wash" : light === "haze" ? "lit lit-haze" : light ? "lit" : "";
 return (
 <section id={id} className={`${lit} ${className}`}>
 <div className="mx-auto max-w-[1180px] px-5">{children}</div>
 </section>
 );
}
