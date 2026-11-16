"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicState } from "@/lib/orders";
import { PendingPayments } from "./PendingPayments";
import { PendingRewards } from "../rewards/PendingRewards";

/** 演出中用手機操作：開唱／收工、暫停點播、開始唱／完成／跳過 */
export function StageConsole({ slug, initial }: { slug: string; initial: PublicState }) {
  const [s, setS] = useState(initial);
  const [location, setLocation] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    const j = await fetch(`/api/p/${slug}/state`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (j) setS(j);
  }, [slug]);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const post = async (url: string, body: object) => {
    setBusy(true);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    await refresh();
    return j as { notified?: number; error?: string };
  };

  const pending = (
    <>
      <PendingPayments onChange={refresh} />
      <PendingRewards compact />
    </>
  );

  if (!s.live)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="h1">演出控制台</h1>
        {pending}
        <section className="card flex flex-col gap-4 p-5">
          <div><h2 className="h2">開始演出</h2><p className="small">開始後觀眾才能點歌，排隊從第 1 首算起。</p></div>
          <label className="field">今天在哪裡演出<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例：駁二大勇倉庫 C5 前" /></label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={notify} onChange={(e) => setNotify(e.target.checked)} />用 LINE 通知追蹤我的 <span className="num">{s.followers}</span> 位粉絲</label>
          <button
            disabled={busy}
            onClick={async () => { const j = await post("/api/dashboard/live", { action: "start", location, notifyFans: notify }); setMsg(j.notified ? `已開始演出，通知了 ${j.notified} 位粉絲` : "已開始演出"); }}
            className="btn btn-now btn-lg"
          >
            開始演出
          </button>
        </section>
      </div>
    );

  const playing = s.queue.find((q) => q.status === "playing");
  const waiting = s.queue.filter((q) => q.status === "waiting");
  const act = (id: string, action: "start" | "done" | "skip") => post(`/api/dashboard/queue/${id}`, { action });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="h1">演出控制台</h1>
          <span className="small flex items-center gap-2"><span className="dot-now" />演出中{s.live.location ? `・${s.live.location}` : ""}・今天 <span className="num">{s.today.count}</span> 筆</span>
        </div>
        <button disabled={busy} onClick={() => post("/api/dashboard/live", { action: "queue", queueOpen: !s.queueOpen })} className={`btn btn-sm ${s.queueOpen ? "btn-secondary" : "btn-quiet"}`}>{s.queueOpen ? "點歌開放中" : "點歌已暫停"}</button>
        <a href="/dashboard/interact" className="btn btn-secondary btn-sm">互動與遊戲</a>
        <button disabled={busy} onClick={() => confirm("確定結束演出？排隊中的點歌會保留在紀錄裡") && post("/api/dashboard/live", { action: "end" })} className="btn btn-primary btn-sm">結束演出</button>
      </div>
      {msg && <button onClick={() => setMsg("")} className="rounded-[12px] bg-sunken px-4 py-2.5 text-left text-[14px]">{msg}</button>}
      {!s.accepting && <p className="rounded-[12px] border-[1.5px] border-err px-4 py-3 text-[14px] text-err">點數不足，觀眾現在無法點歌。請到「點數」補充。</p>}
      {pending}

      <section className="rounded-[20px] bg-ink p-5 text-paper">
        <span className="flex items-center gap-2 text-[13px] text-paper/70"><span className="dot-now" />正在唱</span>
        {playing ? (
          <>
            <div className="mt-1 text-[26px] font-bold leading-9">{playing.title}</div>
            <div className="text-[14px] text-paper/80">{playing.name}{playing.message ? `：「${playing.message}」` : ""}</div>
            <button disabled={busy} onClick={() => act(playing.id, "done")} className="btn btn-now mt-4">唱完了</button>
          </>
        ) : (
          <div className="mt-1 text-[19px] font-bold leading-8">{waiting.length ? "按下一首的「開始唱」" : "現在沒有點歌"}</div>
        )}
      </section>

      <section className="sec">
        <h2 className="h2">排隊 <span className="num text-ink3">{waiting.length}／{s.maxQueue}</span></h2>
        <ol className="mt-1">
          {waiting.map((q, i) => (
            <li key={q.id} className="row flex min-h-[68px] items-center gap-3 py-3">
              <span className="num w-6 shrink-0 text-center text-[18px] font-bold text-ink3">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate">{q.title}</strong>
                <div className="small truncate">{q.name}{q.message ? `：「${q.message}」` : ""}</div>
              </div>
              <button disabled={busy} onClick={() => act(q.id, "start")} className="btn btn-primary btn-sm shrink-0">開始唱</button>
              <button disabled={busy} onClick={() => confirm(`跳過〈${q.title}〉？觀眾會收到通知，退款請自行處理`) && act(q.id, "skip")} className="btn btn-quiet btn-sm shrink-0">跳過</button>
            </li>
          ))}
          {!waiting.length && <li className="small py-8 text-center">還沒有人排隊</li>}
        </ol>
      </section>
    </div>
  );
}
