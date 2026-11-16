"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { nt } from "@/lib/format";

type Period = "session" | "month" | "all";
type Ach = {
  id: string; name: string; emoji: string; kind: string; threshold: number; reward: string | null; current: number; unlocked: number;
  mine: { id: string; status: string; claimCode: string | null } | null;
};
type Data = {
  period: Period;
  board: { rank: number; name: string; avatar: string | null; badge: string | null; count: number; total: number | null; isMe: boolean }[];
  me: { rank: number | null; total: number; gap: number | null; target: number | null } | null;
  loggedIn: boolean;
  achievements: Ach[];
};

const PERIOD_LABEL: Record<Period, string> = { session: "本場", month: "本月", all: "總榜" };
const fmt = (a: Pick<Ach, "kind" | "threshold">) => (a.kind === "count" ? `支持 ${a.threshold} 次` : `累計 ${nt(a.threshold)}`);

export function RankTab({ slug, live, onLogin }: { slug: string; live: boolean; onLogin: () => Promise<boolean> }) {
  const [period, setPeriod] = useState<Period>(live ? "session" : "month");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const j = await fetch(`/api/p/${slug}/rank?period=${period}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (j) setData(j);
  }, [slug, period]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  async function claim(a: Ach) {
    setErr("");
    const r = await fetch(`/api/fan/rewards/${a.mine!.id}/claim`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) setErr(j.error ?? "領取失敗");
    await load();
  }

  const me = data?.me;
  return (
    <section className="flex flex-col gap-5 px-5 pt-4">
      <div className="grid grid-cols-3 gap-2">
        {(["session", "month", "all"] as Period[]).map((k) => (
          <button key={k} onClick={() => setPeriod(k)} className={`btn btn-sm ${period === k ? "btn-primary" : "btn-quiet"}`}>{PERIOD_LABEL[k]}</button>
        ))}
      </div>

      {data && !data.loggedIn && <button onClick={() => onLogin()} className="btn btn-secondary btn-block">用 LINE 登入，計入排行與成就</button>}
      {me && (
        <div className="card flex flex-col gap-1 p-4">
          <span className="label">我的{PERIOD_LABEL[period]}名次</span>
          <div className="flex items-baseline gap-3">
            <strong className="num text-[32px] leading-10">{me.rank ? `第 ${me.rank} 名` : "未上榜"}</strong>
            {me.total > 0 && <span className="small num">累計 {nt(me.total)}</span>}
          </div>
          {me.gap != null && me.target != null && <span className="text-[14px] font-medium text-nowtext">再支持 {nt(me.gap)} 就能{me.rank ? `超越第 ${me.target} 名` : `進到第 ${me.target + 1} 名`}</span>}
          {me.rank === 1 && <span className="text-[14px] font-medium text-nowtext">你目前是第一名</span>}
        </div>
      )}

      <ol className="border-t-2 border-ink">
        {data?.board.map((r) => (
          <li key={r.rank} className={`row flex min-h-[60px] items-center gap-3 py-2.5 ${r.isMe ? "bg-raised" : ""}`}>
            <span className={`num w-7 shrink-0 text-center text-[18px] font-bold ${r.rank <= 3 ? "text-ink" : "text-ink3"}`}>{r.rank}</span>
            <Avatar src={r.avatar} name={r.name} size={36} color="#6b665c" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{r.badge && <span className="mr-1">{r.badge}</span>}{r.name}{r.isMe && <span className="small ml-1">（我）</span>}</div>
              <div className="small num">支持 {r.count} 次</div>
            </div>
            {r.total != null && <strong className="num">{nt(r.total)}</strong>}
          </li>
        ))}
        {data && !data.board.length && <li className="small py-10 text-center">{PERIOD_LABEL[period]}還沒有人上榜。</li>}
      </ol>

      {data && data.achievements.length > 0 && (
        <div className="sec">
          <h3 className="h3">粉絲成就</h3>
          <p className="small">累計支持達標就解鎖；有獎勵的可以向表演者領取。</p>
          {err && <p className="mt-2 text-[14px] text-err">{err}</p>}
          <ul className="mt-2">
            {data.achievements.map((a) => {
              const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
              const done = !!a.mine;
              return (
                <li key={a.id} className="row flex flex-col gap-2 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sunken text-[20px] ${done ? "" : "opacity-50 grayscale"}`}>{a.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <strong>{a.name}</strong>
                      <div className="small">{fmt(a)}{a.reward ? `・獎勵：${a.reward}` : ""}・{a.unlocked} 人達成</div>
                    </div>
                    {done && (!a.reward || a.mine!.status === "redeemed") && <span className="tag">{a.reward ? "已兌換" : "已達成"}</span>}
                  </div>
                  {!done && data.loggedIn && (
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} /></div>
                      <span className="small num shrink-0">{a.kind === "count" ? `${a.current}／${a.threshold} 次` : `${nt(a.current)}／${nt(a.threshold)}`}</span>
                    </div>
                  )}
                  {done && a.reward && a.mine!.status === "unlocked" && <button onClick={() => claim(a)} className="btn btn-primary btn-sm">領取獎勵</button>}
                  {done && a.reward && a.mine!.status === "requested" && (
                    <div className="rounded-[12px] bg-sunken p-3 text-center">
                      <div className="small">出示兌換碼給表演者</div>
                      <div className="num text-[32px] font-bold leading-10 tracking-[.3em]">{a.mine!.claimCode}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
