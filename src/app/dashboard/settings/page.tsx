import { requirePerformer } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";
import { GATEWAY_LABEL } from "@/lib/payments";
import type { KindSlug } from "@/lib/kinds";

export default async function Settings() {
  const { performer: p } = (await requirePerformer())!;
  return (
    <SettingsForm
      initial={{
        slug: p.slug, displayName: p.displayName, avatarUrl: p.avatarUrl ?? "", bio: p.bio, category: p.category as "busker", themeColor: p.themeColor, city: p.city, district: p.district,
        thankYouText: p.thankYouText, presetAmounts: p.presetAmounts, minAmount: p.minAmount, maxAmount: p.maxAmount, maxQueue: p.maxQueue,
        avgSongMinutes: p.avgSongMinutes, showAmounts: p.showAmounts, notifyLine: p.notifyLine,
      }}
      gatewayLabel={GATEWAY_LABEL[p.gateway] ?? p.gateway}
      merchantId={p.gatewayMerchantId}
      payMethods={p.payMethods} kind={p.kind as KindSlug}
    />
  );
}
