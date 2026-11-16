import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { APP_NAME } from "@/lib/env";
import { DashNav } from "../dashboard/DashNav";

export const dynamic = "force-dynamic";
export const metadata = { title: `平台管理｜${APP_NAME}`, robots: { index: false } };

const NAV = [
  ["/admin", "總覽"],
  ["/admin/performers", "表演者"],
  ["/admin/organizers", "店家主辦"],
  ["/admin/events", "活動"],
  ["/admin/orders", "交易"],
  ["/admin/points", "點數"],
  ["/admin/promotions", "曝光"],
  ["/admin/match", "邀約與評價"],
  ["/admin/system", "系統"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-16">
      <header className="flex h-16 items-center gap-3">
        <Link href="/" className="text-[18px] font-bold">{APP_NAME}</Link>
        <span className="text-rule">/</span>
        <span className="font-medium">平台管理</span>
        <Link href="/dashboard" className="small ml-auto underline">表演者後台</Link>
        <form action="/api/admin/logout" method="post"><button className="small underline">登出</button></form>
      </header>
      <DashNav items={NAV} />
      {children}
    </div>
  );
}
