import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireAccount } from "@/lib/auth";
import { fmtPoints, canAcceptOrders } from "@/lib/billing";
import { APP_NAME } from "@/lib/env";
import { getDb } from "@/lib/db";
import { menuItems, orders } from "@/lib/db/schema";
import { BackShell } from "@/components/back/Shell";
import { FEATURES } from "@/lib/features";
import { needsOnboarding } from "@/lib/onboard";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAccount();
  if (!auth) redirect("/login");
  if (auth.performer.accountType === "organizer") redirect(FEATURES.events ? "/org" : "/");
  const p = auth.performer;
  const db = await getDb();

  // 還沒走過引導的新帳號先去設定（該頁在 (onboard) 群組，不吃這個 layout，不會繞圈）
  const [mc] = await db.select({ n: sql<number>`count(*)::int` }).from(menuItems).where(eq(menuItems.performerId, p.id));
  if (needsOnboarding({ displayName: p.displayName, menuCount: Number(mc.n) })) redirect("/dashboard/start");

  // 側欄上的待辦數字：待確認的轉帳收款
  const [pay] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.performerId, p.id), eq(orders.status, "awaiting")));

  const low = !canAcceptOrders(p.pointsCents);
  return (
    <BackShell
      appName={APP_NAME}
      home="/dashboard"
      subtitle="表演者後台"
      title={p.displayName}
      titleHref={`/u/${p.slug}`}
      status={
        <>
          {p.liveSessionId && <span className="tag tag-now"><span className="dot-now mr-1.5" />演出中</span>}
          <Link href="/dashboard/points" className={`tag num ${low ? "!border-err !text-err" : "tag-quiet"}`}>{fmtPoints(p.pointsCents)} 點</Link>
        </>
      }
      actions={auth.session.isAdmin ? <Link href="/admin" className="small underline">平台管理</Link> : null}
      groups={[
        {
          label: "現場",
          items: [
            { href: "/dashboard", label: "總覽" },
            { href: "/dashboard/stage", label: "演出控制台", badge: Number(pay.n) },
            { href: "/dashboard/menu", label: "歌單與服務" },
            ...(FEATURES.games ? [{ href: "/dashboard/interact", label: "互動" }] : []),
          ],
        },
        {
          label: "經營",
          items: [
            { href: "/dashboard/fans", label: "粉絲" },
            { href: "/dashboard/announce", label: "開演公告" },
            { href: "/dashboard/ledger", label: "收入對帳" },
            { href: "/dashboard/points", label: "點數" },
            { href: "/dashboard/plan", label: "方案" },
            { href: "/dashboard/settings", label: "收款與設定" },
          ],
        },
      ]}
    >
      {children}
    </BackShell>
  );
}
