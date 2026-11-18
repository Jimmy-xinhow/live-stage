import { getFan, liveNow, myFollowing, myOrders } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { APP_NAME, env, LIFF_ID } from "@/lib/env";
import { MyFollowing } from "./MyFollowing";
import { myRewards } from "@/lib/rewards";
import Link from "next/link";
import { passport } from "@/lib/hub";
import { nt } from "@/lib/format";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";
export const metadata = { title: `演出護照`, robots: { index: false } };

export default async function Me() {
  const fan = await getFan(await getFanId());
  const [following, orders, live, rewards] = await Promise.all([fan ? myFollowing(fan.id) : [], fan ? myOrders(fan.id) : [], liveNow(), fan ? myRewards(fan.id) : []]);
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const pass = fan ? await passport(fan.id) : null;
  const top = pass && (
    <>
      <section className="pt-6">
        <h1 className="h1">演出護照</h1>
        <p className="small"><strong className="text-ink">{pass.levelName}</strong>・累計 <span className="num font-semibold text-ink">{pass.total}</span> 個簽到章{pass.next ? `・再 ${pass.next - pass.total} 章升級` : ""}</p>
        <div className="mt-3 border-t-2 border-ink">
          {pass.cards.length ? pass.cards.map((c) => (
            <Link key={c.slug} href={c.live ? `/p/${c.slug}` : `/u/${c.slug}`} className="row flex min-h-[56px] items-center gap-3 py-2.5"><span className="flex-1"><strong>{c.name}</strong>{c.live && <span className="tag tag-now ml-2">演出中</span>}</span><span className="small"><span className="num text-[17px] font-bold text-ink">{c.stamps}</span> 章</span></Link>
          )) : <p className="small py-3">到現場掃碼後按「簽到」，就會在這裡集章。</p>}
        </div>
      </section>
      
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
