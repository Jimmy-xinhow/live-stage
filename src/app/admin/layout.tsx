import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/session";
import { APP_NAME } from "@/lib/env";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { BackShell } from "@/components/back/Shell";

export const dynamic = "force-dynamic";
export const metadata = { title: `平台管理｜${APP_NAME}`, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const db = await getDb();
  const [awaiting] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.status, "awaiting")));
  return (
    <BackShell
      appName={APP_NAME}
      home="/admin"
      subtitle="平台管理"
      title="營運後台"
      actions={<Link href="/dashboard" className="small underline">表演者後台</Link>}
      groups={[
        { label: "營運", items: [{ href: "/admin", label: "總覽" }, { href: "/admin/orders", label: "交易", badge: Number(awaiting.n) }, { href: "/admin/points", label: "點數" }, { href: "/admin/promotions", label: "曝光版位" }] },
        { label: "內容", items: [{ href: "/admin/performers", label: "表演者" }, { href: "/admin/organizers", label: "店家主辦" }, { href: "/admin/events", label: "活動" }, { href: "/admin/match", label: "邀約與評價" }] },
        { label: "設定", items: [{ href: "/admin/system", label: "系統" }] },
      ]}
    >
      {children}
    </BackShell>
  );
}
