"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PromoteForm({ where, slots }: { where: string; slots: { id: string; name: string; daily: number; cap: number }[] }) {
  const router = useRouter();
  const [slot, setSlot] = useState(slots[0].id);
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = slots.find((s) => s.id === slot)!;
  async function buy() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/dashboard/promote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, days }) });
    setBusy(false);
    if (!r.ok) return setMsg((await r.json()).error ?? "購買失敗");
    setMsg("已開始刊登");
    router.refresh();
  }
  return (
    <section className="sec flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        {slots.map((s) => (
          <button key={s.id} onClick={() => setSlot(s.id)} aria-pressed={slot === s.id} className={`card flex flex-col items-start gap-1 p-4 text-left ${slot === s.id ? "shadow-[0_2px_0_#151412]" : "!border-rule"}`}>
            <strong className="h3">{s.name}</strong>
            <span className="small">{s.id === "search" ? `出現在「${where}」結果頁最上方` : "出現在首頁「推薦表演者」"}・同地區最多 {s.cap} 格</span>
            <span className="num font-semibold">{s.daily} 點／天</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2"><span className="label mr-1">期間</span>{[7, 14, 30].map((d) => <button key={d} onClick={() => setDays(d)} className={`btn btn-sm ${days === d ? "btn-primary" : "btn-secondary"}`}>{d} 天</button>)}</div>
      <div className="flex flex-wrap items-center gap-4"><button disabled={busy} onClick={buy} className="btn btn-primary">用 <span className="num">{cur.daily * days}</span> 點購買</button>{msg && <span className={msg.startsWith("已") ? "text-ok" : "text-err"}>{msg}</span>}</div>
    </section>
  );
}
