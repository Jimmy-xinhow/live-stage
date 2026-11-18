"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { id?: string; name: string; sharePermille: number; inviteCode: string; bound: boolean };

const pct = (p: number) => (p / 10).toFixed(1).replace(/\.0$/, "");

export function BandForm({ initial, baseUrl }: { initial: Row[]; baseUrl: string }) {
  const r = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : [
    { name: "", sharePermille: 500, inviteCode: "", bound: false },
    { name: "", sharePermille: 500, inviteCode: "", bound: false },
  ]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const total = rows.reduce((n, x) => n + (x.name.trim() ? x.sharePermille : 0), 0);
  const named = rows.filter((x) => x.name.trim()).length;
  const ok = named === 0 || total === 1000;

  const set = (i: number, patch: Partial<Row>) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  /** 平均分配。餘數給第一位，所以三個人是 334/333/333 而不是 33/33/34 */
  function even() {
    const live = rows.filter((x) => x.name.trim());
    if (!live.length) return;
    const base = Math.floor(1000 / live.length);
    const rest = 1000 - base * live.length;
    let k = 0;
    setRows((xs) => xs.map((x) => (x.name.trim() ? { ...x, sharePermille: base + (k++ === 0 ? rest : 0) } : x)));
  }

  async function save() {
    setBusy(true); setErr(""); setMsg("");
    const res = await fetch("/api/dashboard/band", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ members: rows.filter((x) => x.name.trim()).map((x) => ({ id: x.id, name: x.name, sharePermille: x.sharePermille })) }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "存不起來，稍後再試"); return; }
    setMsg("存好了");
    r.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {rows.map((x, i) => (
          <div key={i} className="card flex flex-wrap items-end gap-3 p-4">
            <label className="field min-w-[160px] flex-1">
              <span>團員名字</span>
              <input className="input" value={x.name} onChange={(e) => set(i, { name: e.target.value.slice(0, 40) })} placeholder="例如：阿凱（吉他）" />
            </label>
            <label className="field w-[120px]">
              <span>比例 %</span>
              <input
                className="input num" inputMode="decimal"
                value={pct(x.sharePermille)}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value.replace(/[^\d.]/g, "")) * 10);
                  set(i, { sharePermille: Math.max(0, Math.min(1000, Number.isFinite(v) ? v : 0)) });
                }}
              />
            </label>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1">
              {x.name.trim() && x.inviteCode ? (
                x.bound ? (
                  <span className="tag">已加入，看得到自己的拆帳</span>
                ) : (
                  <>
                    <span className="small">把這條連結給他，用 LINE 登入就綁定</span>
                    <code className="block truncate rounded-[8px] bg-ink/5 px-2 py-1.5 text-[13px]">{baseUrl}/band/{x.inviteCode}</code>
                  </>
                )
              ) : (
                <span className="small">存檔後會產生加入連結</span>
              )}
            </div>
            <button onClick={() => setRows((xs) => xs.filter((_, j) => j !== i))} className="btn btn-quiet btn-sm">移除</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setRows((xs) => [...xs, { name: "", sharePermille: 0, inviteCode: "", bound: false }])} className="btn btn-secondary btn-sm" disabled={rows.length >= 12}>
          加一位
        </button>
        <button onClick={even} className="btn btn-secondary btn-sm">平均分配</button>
        <span className={`num ${ok ? "" : "text-err"}`}>合計 {pct(total)}%</span>
        {!ok && <span className="small text-err">要正好 100% 才能存</span>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy || !ok} className="btn btn-now">{busy ? "存檔中…" : "存檔"}</button>
        {msg && <span className="small">{msg}</span>}
        {err && <span className="small text-err">{err}</span>}
      </div>
    </div>
  );
}
