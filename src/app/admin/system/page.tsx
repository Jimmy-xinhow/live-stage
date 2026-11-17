import { systemChecks } from "@/lib/admin";
import { APP_NAME, POINT_PACKAGES, env } from "@/lib/env";
import { FEATURES } from "@/lib/features";
import { Table } from "../Bits";
import { PageHead } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

const FEATURE_LABELS: Record<string, string> = {
  matching: "邀約媒合與評價",
  events: "活動刊登與店家主辦",
  promote: "付費曝光版位",
  games: "互動遊戲",
  map: "表演地圖",
  seoAreas: "地區 SEO 頁",
  discovery: "公開搜尋與瀏覽",
  rewards: "成就與獎勵",
};

export default async function System() {
  const checks = systemChecks();
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="系統" desc={<>目前這個環境的設定。價格與費率都在環境變數裡，改完重新部署就生效。</>} />

      <section className="sec">
        <h2 className="h2">設定健檢</h2>
        <Table head={["項目", "狀態", "說明"]} rows={checks.map((c) => [c.name, c.ok ? <span key="o" className="text-ok">正常</span> : <span key="o" className="text-nowtext">要注意</span>, c.value])} />
      </section>

      <section className="sec">
        <h2 className="h2">收費設定</h2>
        <Table
          head={["項目", "數值"]}
          rows={[
            ["平台名稱（APP_NAME）", APP_NAME],
            ["成交服務費", `${(env.billing.feeRate * 100).toFixed(1)}%`],
            ["新手贈點", `${env.billing.signupBonusCents / 100} 點`],
            ["可透支", `${env.billing.overdraftCents / 100} 點`],
            ["通知每人", `${env.billing.liveNotifyCents / 100} 點`],
            ["點數方案", POINT_PACKAGES.map((p) => `${p.label}／NT$${p.priceNt}`).join("、")],
          ]}
        />
      </section>

      <section className="sec">
        <h2 className="h2">功能開關</h2>
        <p className="small mb-3 max-w-[620px]">
          2026-11 的收斂：產品定位收回「現場點歌台」這一條線，其餘功能先關掉，程式保留。
          要開回來改 <code className="num">src/lib/features.ts</code> 對應的值。
        </p>
        <Table
          head={["功能", "狀態"]}
          rows={Object.entries(FEATURE_LABELS).map(([k, label]) => [
            label,
            FEATURES[k as keyof typeof FEATURES]
              ? <span key="s" className="text-ok">開啟</span>
              : <span key="s" className="text-ink3">已收起</span>,
          ])}
        />
      </section>
    </div>
  );
}
