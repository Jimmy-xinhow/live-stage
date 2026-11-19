"use client";

import { useState } from "react";
import { fmtTaipei } from "@/lib/format";
import { useRouter } from "next/navigation";

const when = (iso: string) => fmtTaipei(iso);

/** 演出預告：發布後追蹤者收到 LINE 通知，觀眾頁與「我的追蹤」也會顯示 */
export function ShowsManager({ upcoming, followers, costPerFan }: { upcoming: { id: string; startsAt: string; location: string; note: string; notified: number }[]; followers: number; costPerFan: number }) {
  const router = useRouter();
  const [f, setF] = useState({ startsAt: "", location: "", note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const r = await fetch("/api/dashboard/shows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: j.notified ? `已發布，通知了 ${j.notified} 位粉絲` : "已發布" } : { ok: false, text: j.error });
    if (r.ok) { setF({ startsAt: "", location: "", note: "" }); router.refresh(); }
  }

  return (
    <section className="sec">
      <h2 className="h2">演出預告</h2>
      <p className="small">發布下次演出的時間地點，粉絲會收到 LINE 通知，對外頁面也會顯示。</p>
      <div className="card mt-3 flex flex-col gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field">演出時間<input type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></label>
          <label className="field">地點<input placeholder="例：駁二大勇倉庫 C5 前" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
        </div>
        <label className="field">想對粉絲說的話（可不填）<input placeholder="例：這週有新歌" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="small">發布之後會出現在你的點歌頁與作品頁。要讓人知道，用「開演公告」做成圖貼到社群。</span>
          <button disabled={busy || !f.startsAt || !f.location} onClick={add} className="btn btn-primary btn-sm ml-auto">發布</button>
        </div>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-ok" : "text-err"}`}>{msg.text}</p>}
      </div>
      {upcoming.length > 0 && (
        <ul className="mt-3 border-t border-rule">
          {upcoming.map((s) => (
            <li key={s.id} className="row flex items-center gap-3 py-2.5 text-[14px]">
              <strong className="num shrink-0">{when(s.startsAt)}</strong>
              <span className="min-w-0 flex-1 truncate text-ink2">{s.location}{s.note ? `・${s.note}` : ""}</span>
              <span className="small num shrink-0">{s.notified ? `已通知 ${s.notified}` : ""}</span>
              <button onClick={async () => { await fetch(`/api/dashboard/shows/${s.id}`, { method: "DELETE" }); router.refresh(); }} className="small shrink-0 underline">刪除</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
