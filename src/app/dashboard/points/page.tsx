import { desc, eq } from "drizzle-orm";
import { requireAccount } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pointLedger } from "@/lib/db/schema";
import { canAcceptOrders, fmtPoints } from "@/lib/billing";
import { env, POINT_PACKAGES } from "@/lib/env";
import { BuyButton } from "./BuyButton";
import { PageHead } from "@/components/back/Shell";

const REASON: Record<string, string> = { signup_bonus: "新手贈點", purchase: "儲值", fee: "服務費", live_notify: "開演通知", broadcast: "粉絲訊息", adjust: "平台調整", promo: "曝光版位", event_promo: "活動曝光" };

export default async function Points() {
  const { performer: p } = (await requireAccount())!;
  const db = await getDb();
  const ledger = await db.select().from(pointLedger).where(eq(pointLedger.performerId, p.id)).orderBy(desc(pointLedger.createdAt)).limit(40);
  const rate = env.billing.feeRate * 100;
  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageHead
          title="點數"
          desc={<>1 點 = NT$1。每筆成交扣金額的 {rate}%（NT$100 扣 {rate} 點）；曝光版位與粉絲通知也用點數。款項本身直接進你的帳戶，平台不經手。用完後可再透支 {env.billing.overdraftCents / 100} 點，避免演出到一半被暫停。</>}
        />
        <div className="flex items-baseline gap-2"><strong className={`num text-[44px] leading-[52px] ${canAcceptOrders(p.pointsCents) ? "" : "text-err"}`}>{fmtPoints(p.pointsCents)}</strong><span className="h3">點</span></div>
      </section>
      <section className="sec">
        <h2 className="h2">購買點數</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {POINT_PACKAGES.map((k) => (
            <div key={k.id} className="card p-5">
              <strong className="num text-[26px] leading-9">NT${k.priceNt.toLocaleString()}</strong>
              <div className="font-medium">{k.label}</div>
              <div className="small">約可收 NT${Math.floor(k.points / env.billing.feeRate).toLocaleString()} 的點歌打賞</div>
              <BuyButton packageId={k.id} />
            </div>
          ))}
        </div>
      </section>
      <section className="sec">
        <h2 className="h2">點數明細</h2>
        <ul className="mt-2 border-t border-rule text-[14px]">
          {ledger.map((l) => (
            <li key={l.id} className="row flex items-center gap-3 py-2.5">
              <span className="w-20 shrink-0 font-medium">{REASON[l.reason] ?? l.reason}</span>
              <span className="min-w-0 flex-1 truncate text-ink3">{l.note}</span>
              <strong className={`num ${l.deltaCents < 0 ? "" : "text-ok"}`}>{l.deltaCents > 0 ? "+" : ""}{fmtPoints(l.deltaCents)}</strong>
              <span className="small num w-16 text-right">{fmtPoints(l.balanceAfterCents)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
