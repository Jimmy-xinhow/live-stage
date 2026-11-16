"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nt } from "@/lib/format";

type Item = { id: string; name: string; emoji: string; kind: "total" | "count"; threshold: number; reward: string | null; stock: number | null; active: boolean; unlocked: number; redeemed: number; requested: number };

const EMOJIS = ["🌱", "🎧", "🔥", "👑", "💎", "🎸", "⭐", "🏅"];

/** 藝人自訂成就：門檻（累計金額或次數）＋獎勵＋數量上限 */
export function AchievementsManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", emoji: "🏅", kind: "total" as "total" | "count", threshold: 500, reward: "", stock: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(body: object) {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/dashboard/achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: `已新增 ${j.added} 個成就${j.backfilled ? `，${j.backfilled} 位粉絲已經達成` : ""}` } : { ok: false, text: j.error });
    if (r.ok) router.refresh();
    return r.ok;
  }
  const patch = async (id: string, body: object) => {
    await fetch(`/api/dashboard/achievements/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.refresh();
  };

  return (
    <section className="sec">
      <h2 className="h2">粉絲成就</h2>
      <p className="small">可以附上獎勵（簽名小卡、免費點一首、合照），讓粉絲到現場向你領。</p>

      {!items.length && (
        <button disabled={busy} onClick={() => post({ templates: true })} className="mt-4 w-full rounded-[16px] border-2 border-dashed border-ink3 p-4 text-left">
          <strong>套用 4 個建議成就</strong>
          <span className="small block">初次相遇、常客（5 次，免費點一首）、鐵粉（NT$1,000，簽名小卡）、超級粉絲（NT$3,000，合照＋專屬歌）</span>
        </button>
      )}

      <div className="card mt-4 flex flex-col gap-3 p-4">
        <h3 className="h3">新增成就</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[88px_1fr_1fr_120px]">
          <label className="field">徽章<select value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })}>{EMOJIS.map((e) => <option key={e}>{e}</option>)}</select></label>
          <label className="field">名稱<input placeholder="例：鐵粉" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field">條件<select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "total" | "count" })}><option value="total">累計支持金額達</option><option value="count">累計支持次數達</option></select></label>
          <label className="field">門檻（{f.kind === "total" ? "元" : "次"}）<input className="num" type="number" value={f.threshold} onChange={(e) => setF({ ...f, threshold: Number(e.target.value) })} /></label>
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <label className="field">獎勵（可不填）<input placeholder="例：親筆簽名小卡" value={f.reward} onChange={(e) => setF({ ...f, reward: e.target.value })} /></label>
          <label className="field">數量上限<input className="num" type="number" placeholder="不限" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></label>
        </div>
        <button
          disabled={busy || !f.name || f.threshold < 1}
          onClick={async () => { if (await post({ ...f, reward: f.reward || null, stock: f.stock ? Number(f.stock) : null })) setF({ ...f, name: "", reward: "", stock: "" }); }}
          className="btn btn-primary self-start"
        >
          新增成就
        </button>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-ok" : "text-err"}`}>{msg.text}</p>}
      </div>

      <ul className="mt-4 border-t border-rule">
        {items.map((a) => (
          <li key={a.id} className={`row flex flex-wrap items-center gap-3 py-3 ${a.active ? "" : "opacity-50"}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sunken text-[20px]">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <strong>{a.name}</strong><span className="small num ml-2">{a.kind === "total" ? `累計 ${nt(a.threshold)}` : `支持 ${a.threshold} 次`}</span>
              <div className="small">
                {a.reward ? `獎勵：${a.reward}${a.stock ? `（限 ${a.stock} 份）` : ""}` : "只有徽章"}・{a.unlocked} 人達成・{a.redeemed} 已兌換{a.requested ? `・${a.requested} 待兌換` : ""}
              </div>
            </div>
            <button onClick={() => { const r = prompt("獎勵內容（留空＝只給徽章）", a.reward ?? ""); if (r !== null) patch(a.id, { reward: r || null }); }} className="small underline">改獎勵</button>
            <label className="small flex items-center gap-1.5"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={a.active} onChange={(e) => patch(a.id, { active: e.target.checked })} />啟用</label>
            <button onClick={async () => { if (confirm(`刪除〈${a.name}〉？已達成的粉絲紀錄也會一起刪除`)) { await fetch(`/api/dashboard/achievements/${a.id}`, { method: "DELETE" }); router.refresh(); } }} className="small underline">刪除</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
