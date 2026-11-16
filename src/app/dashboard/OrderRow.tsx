"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nt, timeAgo } from "@/lib/format";

type Row = { id: string; name: string; amount: number; itemTitle: string | null; message: string; reply: string | null; hidden: boolean; paidAt: string; canPush: boolean; queueStatus: string | null };
const Q: Record<string, string> = { waiting: "排隊中", playing: "演唱中", done: "已唱", skipped: "已跳過" };

export function OrderRow({ o }: { o: Row }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(o.reply ?? "");
  const [busy, setBusy] = useState(false);
  const act = async (body: object) => {
    setBusy(true);
    const r = await fetch(`/api/dashboard/orders/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) { setOpen(false); router.refresh(); }
  };
  return (
    <li className={`row py-3 ${o.hidden ? "opacity-50" : ""}`}>
      <div className="flex items-baseline gap-2">
        <strong>{o.name}</strong>
        <span className="num font-bold">{nt(o.amount)}</span>
        <span className="small min-w-0 truncate">{o.itemTitle ? `〈${o.itemTitle}〉${o.queueStatus ? `・${Q[o.queueStatus]}` : ""}` : "打賞"}</span>
        <span className="small ml-auto shrink-0 !text-[12px]">{timeAgo(o.paidAt)}</span>
      </div>
      {o.message && <p className="text-[14px] leading-6 text-ink2">{o.message}</p>}
      {o.reply && !open && <p className="mt-1 rounded-[10px] bg-sunken px-3 py-1.5 text-[14px] leading-6">我的回覆：{o.reply}</p>}
      <div className="mt-1 flex gap-4 text-[13px] text-ink2">
        <button onClick={() => setOpen((x) => !x)} className="underline">{o.reply ? "修改回覆" : "回覆"}</button>
        <button disabled={busy} onClick={() => act({ action: o.hidden ? "unhide" : "hide" })} className="underline">{o.hidden ? "重新顯示" : "從留言牆隱藏"}</button>
      </div>
      {open && (
        <div className="mt-2 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} placeholder={o.canPush ? "回覆會同步傳到對方 LINE" : "回覆會顯示在留言牆"} className="input flex-1" />
          <button disabled={busy || !text.trim()} onClick={() => act({ action: "reply", reply: text })} className="btn btn-primary shrink-0">送出</button>
        </div>
      )}
    </li>
  );
}
