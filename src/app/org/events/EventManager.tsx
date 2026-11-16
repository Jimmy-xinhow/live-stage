"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtTaipei } from "@/lib/format";
import { useRouter } from "next/navigation";

type Tag = { slug: string; name: string; status: string };
type Row = {
  id: string; title: string; city: string; place: string; address: string; startsAt: string; endsAt: string | null; description: string;
  priceText: string; link: string; coverUrl: string; guestActs: string; notifyFans: boolean; status: string; tags: Tag[]; lat: string; lng: string;
};
type Form = Omit<Row, "id" | "status" | "tags"> & { performerSlugs: string };

const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16) : "");
const toIso = (v: string) => (v ? new Date(v + "+08:00").toISOString() : "");
const when = (iso: string) => fmtTaipei(iso);
const TAG_LABEL: Record<string, string> = { pending: "等待確認", confirmed: "已確認", declined: "已婉拒" };

export function EventManager({ list, areas, defaultCity, defaultPlace }: { list: Row[]; areas: { slug: string; name: string }[]; defaultCity: string; defaultPlace: string }) {
  const router = useRouter();
  const empty: Form = { title: "", city: defaultCity, place: defaultPlace, address: "", startsAt: "", endsAt: null, description: "", priceText: "", link: "", coverUrl: "", guestActs: "", notifyFans: true, performerSlugs: "", lat: "", lng: "" };
  const [f, setF] = useState<Form>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  function edit(r: Row) {
    setEditing(r.id);
    setOpen(true);
    setF({ ...r, coverUrl: r.coverUrl, startsAt: local(r.startsAt), endsAt: local(r.endsAt), performerSlugs: r.tags.map((t) => t.slug).join(", ") });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const body = {
      ...f,
      startsAt: toIso(f.startsAt),
      endsAt: f.endsAt ? toIso(f.endsAt) : null,
      coverUrl: f.coverUrl || null,
      performerSlugs: f.performerSlugs.split(/[\s,，]+/).filter(Boolean),
    };
    const r = await fetch(editing ? `/api/org/events/${editing}` : "/api/org/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: editing ? "已更新" : "已刊登，被標記的表演者會收到 LINE 確認" } : { ok: false, text: j.error ?? "失敗了" });
    if (r.ok) { setEditing(null); setOpen(false); setF(empty); router.refresh(); }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { setOpen((x) => !x); setEditing(null); setF(empty); }} className="btn btn-primary btn-sm">{open && !editing ? "收起表單" : "刊登新活動"}</button>
        {msg && <span className={`text-[14px] ${msg.ok ? "text-ok" : "text-err"}`}>{msg.text}</span>}
      </div>

      {open && (
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="h3">{editing ? "編輯活動" : "新活動"}</h2>
          <label className="field">活動名稱<input value={f.title} maxLength={60} onChange={(e) => set("title", e.target.value)} placeholder="例：週五爵士之夜" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">縣市<select value={f.city} onChange={(e) => set("city", e.target.value)}>{areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
            <label className="field">場地名稱<input value={f.place} maxLength={60} onChange={(e) => set("place", e.target.value)} placeholder="例：Bar Jade" /></label>
            <label className="field">開始時間<input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></label>
            <label className="field">結束時間（可不填）<input type="datetime-local" value={f.endsAt ?? ""} onChange={(e) => set("endsAt", e.target.value || null)} /></label>
            <label className="field">地址<input value={f.address} maxLength={100} onChange={(e) => set("address", e.target.value)} /></label>
            <label className="field">票價或低消<input value={f.priceText} maxLength={40} onChange={(e) => set("priceText", e.target.value)} placeholder="例：低消 350／自由入場" /></label>
            <label className="field">緯度（可不填，地圖會更準）<input className="num" value={f.lat} onChange={(e) => set("lat", e.target.value)} placeholder="22.6224" /></label>
            <label className="field">經度<input className="num" value={f.lng} onChange={(e) => set("lng", e.target.value)} placeholder="120.2823" /></label>
          </div>
          <label className="field">活動介紹<textarea value={f.description} maxLength={800} rows={4} onChange={(e) => set("description", e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">售票或報名連結（可不填）<input value={f.link} maxLength={300} onChange={(e) => set("link", e.target.value)} /></label>
            <label className="field">主視覺圖片網址（可不填）<input value={f.coverUrl} maxLength={300} onChange={(e) => set("coverUrl", e.target.value)} /></label>
          </div>
          <label className="field">標記平台上的表演者（填他們的網址代號，用逗號分隔）<input value={f.performerSlugs} onChange={(e) => set("performerSlugs", e.target.value)} placeholder="例：demo-mia, demo" /></label>
          <label className="field">其他演出者（不在平台上的，純文字）<input value={f.guestActs} maxLength={200} onChange={(e) => set("guestActs", e.target.value)} /></label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={f.notifyFans} onChange={(e) => set("notifyFans", e.target.checked)} />表演者確認後，用 LINE 通知他的粉絲（依人數扣你的點數）</label>
          <div className="flex gap-2">
            <button disabled={busy || !f.title || !f.startsAt} onClick={save} className="btn btn-primary">{editing ? "儲存" : "刊登活動"}</button>
            <button onClick={() => { setOpen(false); setEditing(null); setF(empty); }} className="btn btn-quiet">取消</button>
          </div>
        </section>
      )}

      <section className="sec">
        <h2 className="h2">已刊登 <span className="num text-ink3">{list.length}</span></h2>
        <div className="mt-1 border-t border-rule">
          {list.length ? list.map((e) => (
            <div key={e.id} className={`row flex flex-wrap items-center gap-3 py-3 ${e.status === "cancelled" ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><Link href={`/e/${e.id}`} className="font-bold underline">{e.title}</Link>{e.status === "cancelled" && <span className="tag tag-quiet">已取消</span>}</div>
                <div className="small">{when(e.startsAt)}・{e.place}</div>
                {e.tags.length > 0 && <div className="small">{e.tags.map((t) => `${t.name}（${TAG_LABEL[t.status]}）`).join("・")}</div>}
              </div>
              <button onClick={() => edit(e)} className="small shrink-0 underline">編輯</button>
              {e.status !== "cancelled" && (
                <button
                  onClick={async () => { if (confirm(`取消「${e.title}」？活動頁會標示已取消。`)) { await fetch(`/api/org/events/${e.id}`, { method: "DELETE" }); router.refresh(); } }}
                  className="small shrink-0 underline"
                >
                  取消活動
                </button>
              )}
            </div>
          )) : <p className="small py-3">還沒有活動。</p>}
        </div>
      </section>
    </>
  );
}
