import { systemChecks } from "@/lib/admin";
import { APP_NAME, POINT_PACKAGES, env } from "@/lib/env";
import { PROMO } from "@/lib/market";
import { EVENT_PROMO } from "@/lib/events";
import { GAME_TYPES, UNITS } from "@/lib/games";
import { Table } from "../Bits";

export const dynamic = "force-dynamic";

export default async function System() {
  const checks = systemChecks();
  return (
    <div className="flex flex-col gap-8">
      <div><h1 className="h1">系統</h1><p className="small">目前這個環境的設定。價格與費率都在環境變數裡，改完重新部署就生效。</p></div>

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
            ["表演者版位", Object.values(PROMO).map((p) => `${p.name} ${p.daily} 點／天（${p.cap} 格）`).join("、")],
            ["活動版位", Object.values(EVENT_PROMO).map((p) => `${p.name} ${p.daily} 點／天（${p.cap} 格）`).join("、")],
          ]}
        />
      </section>

      <section className="sec">
        <h2 className="h2">互動遊戲</h2>
        <Table
          head={["遊戲", "說明", "付費道具"]}
          rows={Object.entries(GAME_TYPES).map(([id, t]) => [
            t.name,
            <span key="d" className="small">{t.desc}</span>,
            UNITS[id as keyof typeof UNITS].length ? UNITS[id as keyof typeof UNITS].map((u) => `${u.name} NT$${u.price}（+${u.power}）`).join("、") : <span key="f" className="text-ok">完全免費</span>,
          ])}
        />
      </section>
    </div>
  );
}
