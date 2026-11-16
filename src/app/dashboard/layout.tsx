import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { fmtPoints, canAcceptOrders } from "@/lib/billing";
import { APP_NAME } from "@/lib/env";
import { DashNav } from "./DashNav";

export const dynamic = "force-dynamic";

const NAV = [
  ["/dashboard", "總覽"],
  ["/dashboard/stage", "演出控制台"],
  ["/dashboard/interact", "互動與遊戲"],
  ["/dashboard/menu", "歌單"],
  ["/dashboard/profile", "對外頁面"],
  ["/dashboard/inquiries", "邀約"],
  ["/dashboard/events", "活動"],
  ["/dashboard/fans", "粉絲"],
  ["/dashboard/rewards", "成就"],
  ["/dashboard/promote", "曝光"],
  ["/dashboard/points", "點數"],
  ["/dashboard/settings", "設定"],
] as const;

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAccount();
  if (!auth) redirect("/login");
  if (auth.performer.accountType === "organizer") redirect("/org");
  const p = auth.performer;
  return (
    <div className="mx-auto max-w-[880px] px-5 pb-16">
      <header className="no-print flex h-16 items-center gap-3">
        <Link href="/" className="text-[18px] font-bold">{APP_NAME}</Link>
        <span className="text-rule">/</span>
        <Link href={`/u/${p.slug}`} className="min-w-0 truncate font-medium underline">{p.displayName}</Link>
        <Link href="/dashboard/points" className={`tag num ml-auto shrink-0 ${canAcceptOrders(p.pointsCents) ? "tag-quiet" : "!border-err !text-err"}`}>{fmtPoints(p.pointsCents)} 點</Link>
        {auth.session.isAdmin && <Link href="/admin" className="small shrink-0 underline">平台管理</Link>}
        <form action="/api/auth/logout" method="post" className="shrink-0"><button className="small underline">登出</button></form>
      </header>
      <DashNav items={NAV} />
      {children}
    </div>
  );
}
