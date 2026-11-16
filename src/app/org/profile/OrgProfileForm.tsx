"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type P = { displayName: string; slug: string; orgKind: "venue" | "organizer" | "brand" | "other"; city: string; district: string; address: string; website: string; bio: string; avatarUrl: string };

export function OrgProfileForm({ initial, areas }: { initial: P; areas: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof P>(k: K, v: P[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    setMsg(null);
    const r = await fetch("/api/org/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    setMsg(r.ok ? { ok: true, text: "已儲存" } : { ok: false, text: j.error ?? "儲存失敗" });
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="sec flex flex-col gap-4">
        <h2 className="h2">基本資料</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">名稱<input value={f.displayName} maxLength={40} onChange={(e) => set("displayName", e.target.value)} /></label>
          <label className="field">網址代號<input value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></label>
          <label className="field">類型
            <select value={f.orgKind} onChange={(e) => set("orgKind", e.target.value as P["orgKind"])}>
              <option value="venue">餐廳、酒吧、展演空間</option>
              <option value="organizer">活動主辦、市集</option>
              <option value="brand">品牌、企業</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label className="field">縣市<select value={f.city} onChange={(e) => set("city", e.target.value)}>{areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
          <label className="field">行政區<input value={f.district} maxLength={30} onChange={(e) => set("district", e.target.value)} placeholder="例：鹽埕區" /></label>
          <label className="field">地址<input value={f.address} maxLength={100} onChange={(e) => set("address", e.target.value)} /></label>
          <label className="field">官網或社群連結<input value={f.website} maxLength={200} onChange={(e) => set("website", e.target.value)} /></label>
          <label className="field">標誌圖片網址（可不填）<input value={f.avatarUrl} maxLength={300} onChange={(e) => set("avatarUrl", e.target.value)} /></label>
        </div>
        <label className="field">介紹<textarea value={f.bio} maxLength={800} rows={4} onChange={(e) => set("bio", e.target.value)} placeholder="例：鹽埕的小型展演空間，每週五六有駐唱。" /></label>
      </section>
      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t-2 border-ink bg-raised px-5 py-3">
        <button onClick={save} className="btn btn-primary">儲存</button>
        {msg && <span className={`text-[14px] ${msg.ok ? "text-ok" : "text-err"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
