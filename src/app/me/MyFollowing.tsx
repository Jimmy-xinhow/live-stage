"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useFan, type FanInfo } from "@/components/useFan";
import { nt, timeAgo, fmtTaipei } from "@/lib/format";
import type { myFollowing } from "@/lib/fans";

type Following = Awaited<ReturnType<typeof myFollowing>>;
type OrderRow = { tradeNo: string; itemTitle: string | null; amount: number; status: string; queueStatus: string | null; reply: string | null; createdAt: string; name: string; slug: string };
type RewardRow = { id: string; status: string; code: string | null; unlockedAt: string; name: string; emoji: string; reward: string | null; performer: string; slug: string };
type LiveRow = { slug: string; name: string; avatar: string | null; color: string; location: string; startedAt: string };

const Q: Record<string, string> = { waiting: "排隊中", playing: "正在唱", done: "已唱", skipped: "沒有唱" };
const when = (iso: string) => fmtTaipei(iso);

export function MyFollowing(props: { fan: FanInfo; following: Following; orders: OrderRow[]; liveNow: LiveRow[]; rewards: RewardRow[]; liffId: string; devLogin: boolean; oaUrl: string; appName: string; children?: React.ReactNode }) {
  const { fan, ensureFan } = useFan(props.fan, props.liffId, props.devLogin);
  const [data, setData] = useState({ following: props.following, orders: props.orders, liveNow: props.liveNow });
  const [rewards, setRewards] = useState(props.rewards);
  const [rerr, setRerr] = useState("");

  async function claim(id: string) {
    setRerr("");
    const r = await fetch(`/api/fan/rewards/${id}/claim`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) return setRerr(j.error ?? "領取失敗");
    setRewards((x) => x.map((w) => (w.id === id ? { ...w, status: j.status, code: j.code } : w)));
  }

  // 登入後立即、之後每 30 秒刷新（誰開唱了）
  useEffect(() => {
    let stop = false;
    const load = async () => {
      const j = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (j && !stop) setData({ following: j.following, orders: j.orders, liveNow: j.liveNow });
    };
    if (fan && !props.fan) load();
    const t = setInterval(load, 30_000);
    return () => { stop = true; clearInterval(t); };
  }, [fan, props.fan]);

  async function toggle(slug: string, key: "follow" | "notify", value: boolean) {
    await fetch(key === "follow" ? "/api/fan/follow" : "/api/fan/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(key === "follow" ? { slug, follow: value } : { slug, notifyLive: value }),
    });
    setData((d) => ({
      ...d,
      following: key === "follow" && !value ? d.following.filter((f) => f.slug !== slug) : d.following.map((f) => (f.slug === slug ? { ...f, notifyLive: value } : f)),
    }));
  }

  const live = data.following.filter((f) => f.live);
  const others = data.following.filter((f) => !f.live);
  const followedSlugs = new Set(data.following.map((f) => f.slug));
  const discover = data.liveNow.filter((l) => !followedSlugs.has(l.slug));

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-16">
      <header className="row flex h-14 items-center gap-3">
        <Link href="/" className="text-[18px] font-bold">{props.appName}</Link>
        <span className="flex-1" />
        {fan && <><span className="small">{fan.name}</span><Avatar src={fan.avatar} name={fan.name} size={32} color="#6b665c" /></>}
      </header>

      {!fan && (
        <section className="pt-8">
          <h1 className="h1">演出護照</h1>
          <p className="small mt-1">用 LINE 登入，就能看到追蹤的表演者誰正在演出、你的簽到章與點歌紀錄。</p>
          <button onClick={() => ensureFan()} className="btn btn-primary btn-lg btn-block mt-6">用 LINE 登入</button>
        </section>
      )}

      {fan && (
        <>
          {props.children}
          <section className="mt-8">
            <h2 className="h3 flex items-center gap-2"><span className="dot-now" />正在演出 <span className="num text-ink3">{live.length}</span></h2>
            <div className="mt-1 border-t-2 border-ink">
              {live.length ? live.map((f) => (
                <Link key={f.slug} href={`/p/${f.slug}`} className="row flex min-h-[68px] items-center gap-3 py-3">
                  <Avatar src={f.avatar} name={f.name} size={40} color="#6b665c" />
                  <div className="min-w-0 flex-1">
                    <strong>{f.name}</strong>
                    <div className="small truncate">{f.live!.location || "現場"}・排隊 {f.live!.waiting} 首・{timeAgo(f.live!.startedAt)}開始</div>
                  </div>
                  <span className="btn btn-now btn-sm shrink-0">去現場頁</span>
                </Link>
              )) : <p className="small py-3">追蹤的表演者現在都沒有演出。開演時會用 LINE 通知你。</p>}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="h3">追蹤中 <span className="num text-ink3">{data.following.length}</span></h2>
            <ul className="mt-1 border-t-2 border-ink">
              {others.map((f) => (
                <li key={f.slug} className="row flex min-h-[64px] items-center gap-3 py-2.5">
                  <Link href={`/u/${f.slug}`}><Avatar src={f.avatar} name={f.name} size={40} color="#6b665c" /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${f.slug}`} className="font-bold">{f.name}</Link>
                    <div className="small truncate">{f.nextShow ? `${when(f.nextShow.startsAt)}・${f.nextShow.location}` : "還沒有演出預告"}</div>
                  </div>
                  <label className="small flex shrink-0 items-center gap-1.5">
                    <input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={f.notifyLive} onChange={(e) => toggle(f.slug, "notify", e.target.checked)} />通知
                  </label>
                  <button onClick={() => confirm(`取消追蹤 ${f.name}？`) && toggle(f.slug, "follow", false)} className="small shrink-0 underline">取消</button>
                </li>
              ))}
              {!data.following.length && <li className="small py-3">還沒有追蹤任何人。點歌時勾選「追蹤」，或在表演者頁按「追蹤」。</li>}
              {data.following.length > 0 && !others.length && <li className="small py-3">追蹤的人都在演出中，見上方。</li>}
            </ul>
          </section>

          {rewards.length > 0 && (
            <section className="mt-8">
              <h2 className="h3">成就與獎勵</h2>
              {rerr && <p className="mt-1 text-[14px] text-err">{rerr}</p>}
              <ul className="mt-1 border-t-2 border-ink">
                {rewards.map((w) => (
                  <li key={w.id} className="row flex min-h-[64px] items-center gap-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sunken text-[20px]">{w.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate"><strong>{w.name}</strong>・<Link href={`/p/${w.slug}?tab=rank`} className="underline">{w.performer}</Link></div>
                      <div className="small truncate">{w.reward ? `獎勵：${w.reward}` : "已達成"}</div>
                    </div>
                    {w.reward && w.status === "unlocked" && <button onClick={() => claim(w.id)} className="btn btn-primary btn-sm shrink-0">領取</button>}
                    {w.status === "requested" && <div className="shrink-0 text-right"><div className="label">出示兌換碼</div><div className="num text-[20px] font-bold tracking-[.12em]">{w.code}</div></div>}
                    {w.status === "redeemed" && <span className="tag tag-quiet shrink-0">已兌換</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.orders.length > 0 && (
            <section className="mt-8">
              <h2 className="h3">我的點歌與打賞</h2>
              <ul className="mt-1 border-t-2 border-ink">
                {data.orders.map((o) => (
                  <li key={o.tradeNo} className="row">
                    <Link href={`/o/${o.tradeNo}`} className="flex min-h-[60px] items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate"><strong>{o.itemTitle ? `〈${o.itemTitle}〉` : "打賞"}</strong>・{o.name}</div>
                        <div className="small truncate">
                          <span className="num">{nt(o.amount)}</span>・{o.status === "awaiting" ? "等表演者確認" : o.queueStatus ? Q[o.queueStatus] : "已支持"}・{timeAgo(o.createdAt)}{o.reply ? "・有回覆" : ""}
                        </div>
                      </div>
                      <span className="small shrink-0 underline">查看</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {props.oaUrl && <a href={props.oaUrl} className="btn btn-secondary btn-block mt-8">加官方帳號好友，才收得到開演通知</a>}
        </>
      )}

      {discover.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">其他正在演出的表演者</h2>
          <div className="mt-1 border-t-2 border-ink">
            {discover.map((l) => (
              <Link key={l.slug} href={`/p/${l.slug}`} className="row flex min-h-[60px] items-center gap-3 py-2.5">
                <Avatar src={l.avatar} name={l.name} size={36} color="#6b665c" />
                <div className="min-w-0 flex-1">
                  <strong>{l.name}</strong>
                  <div className="small truncate">{l.location || "現場"}・{timeAgo(l.startedAt)}開始</div>
                </div>
                <span className="small shrink-0 underline">看現場</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
