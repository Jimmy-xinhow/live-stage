import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireAccount } from "@/lib/auth";
import { fmtPoints, canAcceptOrders } from "@/lib/billing";
import { APP_NAME } from "@/lib/env";
import { getDb } from "@/lib/db";
import { eventPerformers, inquiries, inquiryTargets, orders } from "@/lib/db/schema";
import { BackShell } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAccount();
  if (!auth) redirect("/login");
  if (auth.performer.accountType === "organizer") redirect("/org");
  const p = auth.performer;
  const db = await getDb();

  // 側欄上的待辦數字：待確認收款、待回覆邀約、待確認活動
  const [[pay], [inq], [ev]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.performerId, p.id), eq(orders.status, "awaiting"))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(inquiryTargets)
      .innerJoin(inquiries, eq(inquiries.id, inquiryTargets.inquiryId))
      .where(and(eq(inquiryTargets.performerId, p.id), eq(inquiryTargets.status, "new"))),
    db.select({ n: sql<number>`count(*)::int` }).from(eventPerformers).where(and(eq(eventPerformers.performerId, p.id), eq(eventPerformers.status, "pending"))),
  ]);

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
            { href: "/dashboard/interact", label: "互動與遊戲" },
            { href: "/dashboard/menu", label: "歌單與服務" },
          ],
        },
        {
          label: "接案與曝光",
          items: [
            { href: "/dashboard/inquiries", label: "邀約", badge: Number(inq.n) },
            { href: "/dashboard/events", label: "活動", badge: Number(ev.n) },
            { href: "/dashboard/profile", label: "對外頁面" },
            { href: "/dashboard/promote", label: "曝光推廣" },
          ],
        },
        {
          label: "經營",
          items: [
            { href: "/dashboard/fans", label: "粉絲" },
            { href: "/dashboard/rewards", label: "成就與獎勵" },
            { href: "/dashboard/points", label: "點數" },
            { href: "/dashboard/settings", label: "收款與設定" },
          ],
        },
      ]}
    >
      {children}
    </BackShell>
  );
}
