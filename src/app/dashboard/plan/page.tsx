import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { fmtPoints } from "@/lib/billing";
import { PLANS, planBySlug } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";
import { PageHead } from "@/components/back/Shell";
import { PlanButton } from "./PlanButton";
import { totalsSince } from "@/lib/orders";

export const dynamic = "force-dynamic";

const d = (x: Date | null) =>
  x ? x.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" }) : "";

export default async function Plan() {
  const { performer: p } = (await requireAccount())!;
  const now = effectivePlan(p);
  const current = planBySlug(now);
  const ending = now !== "free" && !p.planAutoRenew;

  // 用他自己最近 30 天的成交去算，而不是給一張空的試算表讓他自己填。
  // 要回答的只有一個問題：這個方案對我划不划算，而答案就在他的帳上。
  const last30 = await totalsSince(p.id, new Date(Date.now() - 30 * 86400_000));
  const costOf = (slug: string) => {
    const pl = planBySlug(slug);
    return Math.round(last30.sum * pl.feeRate) + pl.price;
  };
  const cheapest = last30.count ? PLANS.map((x) => x.slug).reduce((a, b) => (costOf(b) < costOf(a) ? b : a)) : null;

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
        <h2 className="h2">以你最近 30 天的成交來算</h2>
        {last30.count ? (
          <>
            <p className="small mt-1">
              這 30 天成交 <span className="num">{last30.count}</span> 筆、
              共 <span className="num">NT${last30.sum.toLocaleString()}</span>。
              如果下個月差不多，每個方案一個月要付這些（月費＋服務費）：
            </p>
            <ul className="mt-3 flex flex-col">
              {PLANS.map((x) => {
                const total = costOf(x.slug);
                const best = x.slug === cheapest;
                return (
                  <li key={x.slug} className="row flex items-center gap-3 py-3">
                    <strong className="w-20 shrink-0">{x.name}</strong>
                    <span className="small flex-1">
                      月費 <span className="num">NT${x.price.toLocaleString()}</span>
                      　服務費 <span className="num">NT${Math.round(last30.sum * x.feeRate).toLocaleString()}</span>
                      （{(x.feeRate * 100).toFixed(0)}%）
                    </span>
                    <span className={`num shrink-0 text-[17px] font-bold ${best ? "text-nowtext" : ""}`}>
                      NT${total.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="small mt-3">
              以你目前的量，<strong>{planBySlug(cheapest!).name}</strong>最省。
              但便宜不是唯一理由——互動遊戲和樂團拆帳是看你要不要用，不是看划不划算。
            </p>
          </>
        ) : (
          <p className="small mt-1">
            這 30 天還沒有成交紀錄，所以沒辦法幫你算。有幾筆之後再回來看，
            這裡會用你自己的數字比，不是用範例。
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
