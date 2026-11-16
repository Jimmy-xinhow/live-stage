import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { fmtPoints } from "@/lib/billing";
import { APP_NAME } from "@/lib/env";
import { DashNav } from "../dashboard/DashNav";

export const dynamic = "force-dynamic";

const NAV = [
  ["/org", "總覽"],
  ["/org/events", "我的活動"],
  ["/org/promote", "活動曝光"],
  ["/org/profile", "場地資料"],
  ["/org/points", "點數"],
] as const;

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAccount();
  if (!auth) redirect("/login");
  if (auth.performer.accountType !== "organizer") redirect("/dashboard");
  const p = auth.performer;
  return (
    <div className="mx-auto max-w-[880px] px-5 pb-16">
      <header className="no-print flex h-16 items-center gap-3">
        <Link href="/" className="text-[18px] font-bold">{APP_NAME}</Link>
        <span className="text-rule">/</span>
        <span className="min-w-0 truncate font-medium">{p.displayName}</span>
        <Link href="/org/points" className="tag tag-quiet num ml-auto shrink-0">{fmtPoints(p.pointsCents)} 點</Link>
        <form action="/api/auth/logout" method="post" className="shrink-0"><button className="small underline">登出</button></form>
      </header>
      <DashNav items={NAV} />
      {children}
    </div>
  );
}
