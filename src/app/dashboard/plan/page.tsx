import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { fmtPoints } from "@/lib/billing";
import { PLANS, planBySlug } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";
import { PageHead } from "@/components/back/Shell";
import { PlanButton } from "./PlanButton";

export const dynamic = "force-dynamic";

const d = (x: Date | null) =>
  x ? x.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" }) : "";

export default async function Plan() {
  const { performer: p } = (await requireAccount())!;
  const now = effectivePlan(p);
  const current = planBySlug(now);
  const ending = now !== "free" && !p.planAutoRenew;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageHead
          title="方案"
          desc={<>月費從你的點數餘額扣，和服務費同一本帳。按月計算，隨時可以取消——取消後當期用到底，不扣下一期。</>}
        />
        <div className="card flex flex-wrap items-end justify-between gap-4 p-5">
          <div>
            <div className="small">目前方案</div>
            <strong className="h2">{current.name}</strong>
            <p className="small mt-1">
              成交服務費 <span className="num">{(current.feeRate * 100).toFixed(0)}%</span>
              {now !== "free" && p.planUntil && (
                <>　{ending ? "用到" : "下次扣款"} {d(p.planUntil)}</>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="small">點數餘額</div>
            <Link href="/dashboard/points" className="num h2 underline decoration-1 underline-offset-4">
              {fmtPoints(p.pointsCents)}
            </Link>
          </div>
        </div>

        {ending && (
          <p className="small mt-3">
            已取消續期。{d(p.planUntil)} 之後會回到免費方案，點歌收款不受影響，成交服務費回到 3%。
            想繼續的話在下面重新選一次就好，不會重複收費。
          </p>
        )}
      </section>

      <section className="sec">
        <h2 className="h2">換方案</h2>
        <p className="small mt-1">
          升級立刻生效，當下扣一個月。如果你現在就在付費方案，沒用完的天數會按比例折抵。
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {PLANS.map((x) => {
            const isNow = x.slug === now;
            return (
              <div key={x.slug} className={`card flex flex-col gap-3 p-5 ${isNow ? "!border-now" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="h3">{x.name}</strong>
                  {isNow ? (
                    <span className="tag tag-now">使用中</span>
                  ) : (
                    <span className="num">{x.price ? `NT$${x.price.toLocaleString()}／月` : "免費"}</span>
                  )}
                </div>
                <p className="small">{x.who}</p>
                <ul className="flex flex-col gap-1.5 text-[15px] leading-6">
                  {x.adds.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="shrink-0 text-now">＋</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2">
                  {isNow ? (
                    x.slug === "free" ? (
                      <p className="small">核心功能全部都有，不是試用版。</p>
                    ) : ending ? (
                      <PlanButton to={x.slug} label="繼續訂閱" kind="now" />
                    ) : (
                      <PlanButton to="free" label="取消續期" kind="quiet" />
                    )
                  ) : x.slug === "free" ? (
                    <PlanButton to="free" label="取消續期，回到免費" kind="quiet" />
                  ) : (
                    <PlanButton
                      to={x.slug}
                      label={`選這個・扣 ${x.price.toLocaleString()} 點`}
                      kind={x.slug === "play" ? "now" : "secondary"}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sec">
        <h2 className="h2">幾件要先知道的事</h2>
        <ul className="mt-2 flex flex-col gap-2 text-[15px] leading-7">
          <li>月費不讓透支。服務費可以小額透支是因為那代表有收入進來，月費沒有這個道理——點數不夠就先去儲值。</li>
          <li>到期時會自動從點數續一期。點數不夠就會降回免費方案並用 LINE 通知你，不會讓你欠一筆。</li>
          <li>降回免費不影響你已經收到的錢，也不會刪掉任何資料。互動遊戲會關掉，歌單、粉絲、演出紀錄都留著。</li>
          <li>
            每個方案包含什麼，<Link href="/pricing" className="underline decoration-1 underline-offset-4">方案頁</Link>有完整說明。
          </li>
        </ul>
      </section>
    </div>
  );
}
