import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/session";
import { APP_NAME } from "@/lib/env";
import { getDb } from "@/lib/db";
import { orders, reports } from "@/lib/db/schema";
import { BackShell } from "@/components/back/Shell";

export const dynamic = "force-dynamic";
// 根版面的 template 已經會接上品牌名，這裡再接一次就會變成「平台管理｜安可｜安可」
export const metadata = { title: "平台管理", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const db = await getDb();
  const [[awaiting], [newReports]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, "awaiting"))),
    db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "new")),
  ]);
  return (
    <BackShell
      appName={APP_NAME}
      home="/admin"
      subtitle="平台管理"
      title="營運後台"
      actions={<Link href="/dashboard" className="small underline">表演者後台</Link>}
      groups={[
        {
          label: "營運",
          items: [
            { href: "/admin", label: "總覽" },
            { href: "/admin/orders", label: "交易", badge: Number(awaiting.n) },
            { href: "/admin/points", label: "點數" },
          ],
        },
        {
          label: "內容",
          items: [
            { href: "/admin/performers", label: "表演者" },
            { href: "/admin/reports", label: "內容檢舉", badge: Number(newReports.n) },
          ],
        },
        { label: "設定", items: [{ href: "/admin/usage", label: "功能使用" }, { href: "/admin/logs", label: "操作紀錄" }, { href: "/admin/system", label: "系統" }] },
      ]}
    >
      {children}
    </BackShell>
  );
}
