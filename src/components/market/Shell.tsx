import Link from "next/link";
import { APP_NAME } from "@/lib/env";

/** 行銷頁的頁首。產品後台不吃這個，那邊維持紙本質感 */
export function StageHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--night)]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-7 px-5">
        <Link href="/" className="text-[19px] font-black tracking-tight">{APP_NAME}</Link>
        <nav className="hidden items-center gap-6 text-[15px] text-[color:var(--dim)] md:flex">
          <Link href="/for/street">街頭</Link>
          <Link href="/for/venue">駐唱與樂團</Link>
          <Link href="/for/streamer">直播</Link>
          <Link href="/pricing">方案</Link>
        </nav>
        <span className="flex-1" />
        <Link href="/p/demo" className="hidden text-[15px] text-[color:var(--dim)] md:block">看示範</Link>
        <Link href="/login" className="sbtn sbtn-main !h-10 !px-5 !text-[15px]">免費建立</Link>
      </div>
    </header>
  );
}

export function StageFooter() {
  return (
    <footer className="rule mt-6">
      <div className="mx-auto max-w-[1180px] px-5 py-12">
        <div className="flex flex-wrap gap-x-7 gap-y-3 text-[15px] text-[color:var(--dim)]">
          <Link href="/for/street">給街頭藝人</Link>
          <Link href="/for/venue">給駐唱與樂團</Link>
          <Link href="/for/streamer">給直播主</Link>
          <Link href="/pricing">方案與費用</Link>
          <Link href="/p/demo">看示範頁</Link>
          <Link href="/login">登入</Link>
          <Link href="/me">我的護照</Link>
        </div>
        <p className="mt-8 text-[13px] text-[color:var(--dim)]">
          {APP_NAME}　星昊科技有限公司　款項由聽眾直接付給表演者，平台不經手
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
