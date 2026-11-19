"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTS, BUDGETS, GUESTS, OCCASIONS } from "@/lib/acts";
import { AREAS } from "@/lib/areas";
import { useFan, type FanInfo } from "@/components/useFan";

export function InviteForm(props: { to: { slug: string; name: string; act: string } | null; init: { city: string; act: string; occasion: string }; fan: FanInfo;}) {
  const { fan, ensureFan } = useFan(props.fan);
  const [f, setF] = useState({
    contactName: props.fan?.name ?? "", occasion: OCCASIONS.includes(props.init.occasion) ? props.init.occasion : OCCASIONS[0], actType: props.init.act, eventDate: "", timeText: "",
    city: props.init.city, place: "", guests: GUESTS[1], budget: BUDGETS[1], note: "", broadcast: !props.to });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string[] | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!(await ensureFan())) return setErr("請用 LINE 開啟這個頁面，報價才能傳到你的 LINE");
    setBusy(true);
    const r = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, actType: f.actType || null, to: props.to?.slug ?? null }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "送出失敗");
    setDone(j.names);
  }

  if (done)
    return (
      <div className="flex flex-col gap-4 py-6">
        <h1 className="h1">邀約已送出</h1>
        <p className="text-ink2">已通知 {done.join("、")}。報價會傳到你的 LINE，也可以在「我的護照」看到回覆。</p>
        <div className="card p-5"><div className="h3">{f.occasion}・{f.eventDate} {f.timeText}</div><div className="small">{AREAS.find((a) => a.slug === f.city)?.name} {f.place}・{f.guests}・{f.budget}</div></div>
        <div className="flex gap-3"><Link href="/me" className="btn btn-primary">看我的邀約</Link><Link href="/find" className="btn btn-secondary">繼續看表演者</Link></div>
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h1 className="h1">{props.to ? `邀請 ${props.to.name} 演出` : "邀請演出"}</h1>
        <p className="small mt-1">免費送出・平台不抽成、不經手款項。{fan ? `報價會傳到 ${fan.name} 的 LINE。` : "送出時會請你用 LINE 登入，報價才收得到。"}</p>
      </div>
      <div className="sec grid gap-4 md:grid-cols-2">
        <label className="field">活動場合<select value={f.occasion} onChange={(e) => set("occasion", e.target.value)}>{OCCASIONS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="field">想找的表演<select value={f.actType} onChange={(e) => set("actType", e.target.value)}><option value="">不限，請推薦</option>{ACTS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
        <label className="field">活動日期<input type="date" required value={f.eventDate} onChange={(e) => set("eventDate", e.target.value)} /></label>
        <label className="field">演出時段<input value={f.timeText} onChange={(e) => set("timeText", e.target.value)} placeholder="例：18:30–20:30" maxLength={40} /></label>
        <label className="field">縣市<select required value={f.city} onChange={(e) => set("city", e.target.value)}><option value="">請選擇</option>{AREAS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
        <label className="field">地點<input value={f.place} onChange={(e) => set("place", e.target.value)} placeholder="例：前鎮區・某某宴會廳" maxLength={60} /></label>
        <label className="field">來賓人數<select value={f.guests} onChange={(e) => set("guests", e.target.value)}>{GUESTS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="field">預算（每場）<select value={f.budget} onChange={(e) => set("budget", e.target.value)}>{BUDGETS.map((o) => <option key={o}>{o}</option>)}</select></label>
        <label className="field md:col-span-2">想說的話（曲風、指定曲目、流程、場地有沒有音響）<textarea value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={300} /></label>
        <label className="field md:col-span-2">怎麼稱呼你<input required value={f.contactName} onChange={(e) => set("contactName", e.target.value)} maxLength={30} /></label>
      </div>
      {props.to && (
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={f.broadcast} onChange={(e) => set("broadcast", e.target.checked)} className="h-5 w-5 accent-ink" />也送給同地區其他符合的表演者（最多 5 位）</label>
      )}
      {err && <p className="text-err">{err}</p>}
      <button disabled={busy} className="btn btn-primary btn-lg">{busy ? "送出中…" : "送出邀約"}</button>
      <p className="small text-ink3">你的聯絡方式不會公開。表演者回覆報價後，由你決定要跟誰聯絡。</p>
    </form>
  );
}
