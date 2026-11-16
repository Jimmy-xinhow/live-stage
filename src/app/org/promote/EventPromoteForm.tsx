"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EventPromoteForm({ events, slots }: { events: { id: string; title: string }[]; slots: { id: string; name: string; daily: number; cap: number }[] }) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [slot, setSlot] = useState(slots[0]?.id ?? "");
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const cfg = slots.find((s) => s.id === slot);

  if (!events.length) return <p className="sec small">還沒有即將舉行的活動，先到「我的活動」刊登一場。</p>;
  return (
    <section className="card flex flex-col gap-4 p-5">
      <h2 className="h3">買版位</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">活動<select value={eventId} onChange={(e) => setEventId(e.target.value)}>{events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
        <label className="field">版位<select value={slot} onChange={(e) => setSlot(e.target.value)}>{slots.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.daily} 點／天・每區 {s.cap} 格）</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mr-1">天數</span>
        {[7, 14, 30].map((d) => <button key={d} onClick={() => setDays(d)} className={`btn btn-sm ${days === d ? "btn-primary" : "btn-secondary"}`}>{d} 天</button>)}
        {cfg && <span className="small num ml-2">共 {cfg.daily * days} 點</span>}
      </div>
      <button
        disabled={busy || !eventId}
        onClick={async () => {
          setBusy(true); setMsg(null);
          const r = await fetch("/api/org/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, slot, days }) });
          const j = await r.json();
          setBusy(false);
          setMsg(r.ok ? { ok: true, text: "已刊登" } : { ok: false, text: j.error ?? "失敗了" });
          if (r.ok) router.refresh();
        }}
        className="btn btn-primary self-start"
      >
        用點數刊登
      </button>
      {msg && <p className={`text-[14px] ${msg.ok ? "text-ok" : "text-err"}`}>{msg.text}</p>}
      <p className="small">價格是暫定值，正式上線前會依實際流量調整。</p>
    </section>
  );
}
