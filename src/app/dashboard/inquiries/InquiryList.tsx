"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nt } from "@/lib/format";

type Row = { id: string; contactName: string; occasion: string; eventDate: string; timeText: string; cityName: string; place: string; guests: string; budget: string; note: string; createdAt: string; status: string; quoteAmount: number | null; quoteNote: string | null };

export function InquiryList({ list }: { list: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  async function reply(id: string, body: Record<string, unknown>) {
    setErr("");
    const r = await fetch(`/api/dashboard/inquiries/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return setErr((await r.json()).error ?? "失敗了");
    setOpen(null); setAmount(""); setNote("");
    router.refresh();
  }
  if (!list.length) return <p className="sec small">還沒有邀約。把「對外頁面」的介紹、起價和可接場合填完整，比較容易被找到。</p>;
  return (
    <div className="border-t-2 border-ink">
      {list.map((q) => (
        <div key={q.id} className="row flex flex-col gap-2 py-4">
          <div className="flex flex-wrap items-center gap-2"><strong className="h3">{q.occasion}・{q.eventDate} {q.timeText}</strong>{q.status === "new" ? <span className="tag tag-now">待回覆</span> : q.status === "quoted" ? <span className="tag">已報價 {q.quoteAmount ? nt(q.quoteAmount) : "面議"}</span> : <span className="tag tag-quiet">已婉拒</span>}</div>
          <div className="small">{q.cityName} {q.place}・{q.guests}・預算 {q.budget}・{q.contactName}</div>
          {q.note && <p className="max-w-[600px] text-ink2">{q.note}</p>}
          {q.status === "new" && open !== q.id && <div className="flex gap-2"><button className="btn btn-primary btn-sm" onClick={() => setOpen(q.id)}>回覆報價</button><button className="btn btn-quiet btn-sm" onClick={() => reply(q.id, { decline: true })}>這場沒辦法</button></div>}
          {open === q.id && (
            <div className="card flex flex-col gap-3 p-4">
              <label className="field max-w-[240px]">報價（NT$，留空＝面議）<input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label className="field">給對方的話（包含什麼、時數、怎麼聯絡你）<textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></label>
              {err && <p className="text-err">{err}</p>}
              <div className="flex gap-2"><button className="btn btn-primary btn-sm" onClick={() => reply(q.id, { amount: amount === "" ? undefined : Number(amount), note })}>送出報價</button><button className="btn btn-quiet btn-sm" onClick={() => setOpen(null)}>取消</button></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
