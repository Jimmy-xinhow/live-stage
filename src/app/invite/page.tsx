import type { Metadata } from "next";
import { APP_NAME, LIFF_ID, env } from "@/lib/env";
import { getPerformerBySlug } from "@/lib/orders";
import { getFan } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { areaBySlug } from "@/lib/areas";
import { actBySlug, actName } from "@/lib/acts";
import { SiteHeader } from "@/components/Site";
import { InviteForm } from "./InviteForm";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `邀請演出｜${APP_NAME}`, description: "免費送出演出邀約：婚禮、尾牙、餐廳駐唱、企業活動。符合條件的表演者會把報價傳到你的 LINE，平台不抽成。", alternates: { canonical: "/invite" } };

export default async function Invite({ searchParams }: { searchParams: Promise<{ to?: string; city?: string; act?: string; occasion?: string }> }) {
  if (!FEATURES.matching) notFound();
  const sp = await searchParams;
  const to = sp.to ? await getPerformerBySlug(sp.to) : null;
  const fan = await getFan(await getFanId());
  return (
    <>
      <SiteHeader />
      <main className="wrap max-w-[640px] py-8">
        <InviteForm
          to={to && to.bookable ? { slug: to.slug, name: to.displayName, act: actName(to.actType) } : null}
          init={{ city: areaBySlug(sp.city)?.slug ?? to?.city ?? "", act: actBySlug(sp.act)?.slug ?? to?.actType ?? "", occasion: sp.occasion ?? "" }}
          fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null}
          liffId={LIFF_ID}
          devLogin={env.allowDevLogin}
        />
      </main>
    </>
  );
}
