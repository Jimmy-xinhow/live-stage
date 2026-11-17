import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { fmtPoints } from "@/lib/billing";
import { APP_NAME } from "@/lib/env";
import { BackShell } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAccount();
  if (!auth) redirect("/login");
  if (auth.performer.accountType !== "organizer") redirect("/dashboard");
  const p = auth.performer;
  return (
    <BackShell
      appName={APP_NAME}
      home="/org"
      subtitle="店家主辦後台"
      title={p.displayName}
      status={<Link href="/org/points" className="tag tag-quiet num">{fmtPoints(p.pointsCents)} 點</Link>}
      groups={[
        { label: "活動", items: [{ href: "/org", label: "總覽" }, { href: "/org/events", label: "我的活動" }, { href: "/org/promote", label: "活動曝光" }] },
        { label: "帳號", items: [{ href: "/org/profile", label: "場地資料" }, { href: "/org/points", label: "點數" }] },
        { label: "找表演者", items: [{ href: "/invite", label: "送出邀約" }, { href: "/find", label: "搜尋表演者" }] },
      ]}
    >
      {children}
    </BackShell>
  );
}
