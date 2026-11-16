"use client";

import { useState } from "react";

/** 活動結束後給表演者評價：只有自己送出過、而且拿到報價的邀約可以評 */
export function ReviewForm({ inquiryId, slug, name, done }: { inquiryId: string; slug: string; name: string; done: boolean }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sent" | string>(done ? "sent" : "idle");

  if (state === "sent") return <span className="small text-ok">已評價，謝謝你</span>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm self-start">
        評價 {name}
      </button>
    );
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="label">幾顆星</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} 顆星`} className={`num flex h-9 w-9 items-center justify-center rounded-[10px] text-[15px] font-bold ${n <= rating ? "bg-ink text-paper" : "bg-sunken text-ink3"}`}>{n}</button>
        ))}
      </div>
      <label className="field">想說的話（會公開在他的作品頁）<textarea value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="例：準時、配合度高，客人反應很好" /></label>
      {typeof state === "string" && state !== "idle" && <p className="text-[14px] text-err">{state}</p>}
      <div className="flex gap-2">
        <button
          className="btn btn-primary btn-sm"
          onClick={async () => {
            const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inquiryId, slug, rating, review: text }) });
            if (r.ok) setState("sent");
            else setState((await r.json()).error ?? "送出失敗");
          }}
        >
          送出評價
        </button>
        <button className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>取消</button>
      </div>
    </div>
  );
}
