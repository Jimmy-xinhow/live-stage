import { requirePerformer } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";
import { GATEWAY_LABEL } from "@/lib/payments";
import type { KindSlug } from "@/lib/kinds";
import { planHasPro, planIsPaid } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";

export default async function Settings() {
  const { performer: p } = (await requirePerformer())!;
  return (
    <SettingsForm
      paid={planIsPaid(effectivePlan(p))}
      pro={planHasPro(effectivePlan(p))}
      initial={{
        slug: p.slug, displayName: p.displayName, avatarUrl: p.avatarUrl ?? "", bio: p.bio, category: p.category as "busker", themeColor: p.themeColor, city: p.city, district: p.district,
        thankYouText: p.thankYouText, presetAmounts: p.presetAmounts, minAmount: p.minAmount, maxAmount: p.maxAmount, maxQueue: p.maxQueue,
        avgSongMinutes: p.avgSongMinutes, showAmounts: p.showAmounts, hideBranding: p.hideBranding, streamDelaySec: p.streamDelaySec, notifyLine: p.notifyLine,
      }}
      gatewayLabel={GATEWAY_LABEL[p.gateway] ?? p.gateway}
      merchantId={p.gatewayMerchantId}
      payMethods={p.payMethods} kind={p.kind as KindSlug}
    />
  );
}
