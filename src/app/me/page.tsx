import { getFan, liveNow, myFollowing, myOrders } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { APP_NAME, env, LIFF_ID } from "@/lib/env";
import { MyFollowing } from "./MyFollowing";
import { myRewards } from "@/lib/rewards";
import Link from "next/link";
import { passport } from "@/lib/hub";
import { myInquiries } from "@/lib/market";
import { nt } from "@/lib/format";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";
export const metadata = { title: `演出護照｜${APP_NAME}`, robots: { index: false } };

export default async function Me() {
  const fan = await getFan(await getFanId());
  const [following, orders, live, rewards] = await Promise.all([fan ? myFollowing(fan.id) : [], fan ? myOrders(fan.id) : [], liveNow(), fan ? myRewards(fan.id) : []]);
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const [pass, inq] = fan ? await Promise.all([passport(fan.id), myInquiries(fan.id)]) : [null, []];
  const top = pass && (
    <>
      <section className="pt-6">
        <h1 className="h1">演出護照</h1>
        <p className="small"><strong className="text-ink">{pass.levelName}</strong>・累計 <span className="num font-semibold text-ink">{pass.total}</span> 個簽到章{pass.next ? `・再 ${pass.next - pass.total} 章升級` : ""}</p>
        <div className="mt-3 border-t-2 border-ink">
          {pass.cards.length ? pass.cards.map((c) => (
            <Link key={c.slug} href={c.live ? `/p/${c.slug}/hub` : `/u/${c.slug}`} className="row flex min-h-[56px] items-center gap-3 py-2.5"><span className="flex-1"><strong>{c.name}</strong>{c.live && <span className="tag tag-now ml-2">演出中</span>}</span><span className="small"><span className="num text-[17px] font-bold text-ink">{c.stamps}</span> 章</span></Link>
          )) : <p className="small py-3">到現場掃碼後按「簽到」，就會在這裡集章。</p>}
        </div>
      </section>
      {inq.length > 0 && (
        <section className="mt-8"><h2 className="h3">我的邀約</h2><div className="mt-1 border-t-2 border-ink">{inq.map((q) => (
          <div key={q.id + q.slug} className="row flex flex-col gap-1 py-3">
            <span className="flex flex-wrap items-center gap-2"><Link href={`/u/${q.slug}`} className="font-bold underline">{q.name}</Link>{q.status === "quoted" ? <span className="tag tag-now">報價 {q.quoteAmount ? nt(q.quoteAmount) : "面議"}</span> : q.status === "declined" ? <span className="tag tag-quiet">無法配合</span> : <span className="tag tag-quiet">等待回覆</span>}</span>
            <span className="small">{q.occasion}・{q.eventDate}{q.quoteNote ? `・${q.quoteNote}` : ""}</span>
            {q.status === "quoted" && q.eventDate <= today && <ReviewForm inquiryId={q.id} slug={q.slug} name={q.name} done={q.reviewed} />}
          </div>
        ))}</div></section>
      )}
    </>
  );
  return (
    <MyFollowing
      fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null}
      following={following}
      orders={orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))}
      liveNow={live.map((l) => ({ ...l, startedAt: l.startedAt.toISOString() }))}
      rewards={rewards.map((r) => ({ ...r, unlockedAt: r.unlockedAt.toISOString() }))}
      liffId={LIFF_ID}
      devLogin={env.allowDevLogin}
      oaUrl={env.line.oaAddFriendUrl}
      appName={APP_NAME}
    >
      {top}
    </MyFollowing>
  );
}
