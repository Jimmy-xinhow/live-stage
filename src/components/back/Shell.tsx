import Link from "next/link";
import { BackNav, type NavGroup } from "./BackNav";

/** 三個後台共用的外框：側欄導覽（桌機）／收合選單（手機）＋頂部狀態列 */
export function BackShell({
  appName, home, title, subtitle, titleHref, groups, status, actions, children,
}: {
  appName: string;
  home: string;
  title: string;
  subtitle: string;
  titleHref?: string;
  groups: NavGroup[];
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="no-print border-rule md:sticky md:top-0 md:h-dvh md:overflow-y-auto md:border-r">
        <div className="flex h-16 items-center gap-2 px-5 md:px-6">
          <Link href="/" className="text-[17px] font-bold">{appName}</Link>
          <span className="text-rule">/</span>
          <span className="small font-medium text-ink2">{subtitle}</span>
        </div>
        <div className="px-5 pb-4 md:px-6">
          {titleHref ? (
            <Link href={titleHref} className="block truncate text-[17px] font-bold underline decoration-rule underline-offset-4">{title}</Link>
          ) : (
            <span className="block truncate text-[17px] font-bold">{title}</span>
          )}
          {status && <div className="mt-2 flex flex-wrap items-center gap-2">{status}</div>}
        </div>
        <BackNav groups={groups} />
        <div className="no-print hidden items-center gap-3 px-6 py-5 md:flex">
          {actions}
          <form action="/api/auth/logout" method="post"><button className="small underline">登出</button></form>
        </div>
      </aside>
      <main className="px-5 pb-20 pt-2 md:px-10 md:pt-8">
        <div className="mx-auto max-w-[840px]">{children}</div>
      </main>
    </div>
  );
}

/** 每一頁的頁首：標題、說明、右側動作 */
export function PageHead({ title, desc, actions }: { title: string; desc?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-4">
      <div className="min-w-0">
        <h1 className="h1">{title}</h1>
        {desc && <p className="small mt-1 max-w-[600px]">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** 區塊：標題、說明與內容的固定組合 */
export function Section({ title, desc, actions, children }: { title: string; desc?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h2">{title}</h2>
        {actions}
      </div>
      {desc && <p className="small mb-3 max-w-[600px]">{desc}</p>}
      {children}
    </section>
  );
}

/** 空狀態：說一句現在是什麼情況，再給一個下一步 */
export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[16px] border border-dashed border-rule bg-raised px-5 py-8">
      <p className="text-[15px] text-ink2">{text}</p>
      {action}
    </div>
  );
}
