"use client";

import { useState } from "react";

/**
 * 跟進：還沒準備好註冊的人留個 Email，之後寄上線通知與使用指南。
 * 不是彈窗、不擋內容——在頁尾安靜地問一次就好。
 */
export function Lead({ dark = false }: { dark?: boolean } = {}) {
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("street");
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");

  async function send() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState("err");
    setState("busy");
    const r = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), kind }),
    }).catch(() => null);
    setState(r?.ok ? "done" : "err");
  }

  if (state === "done")
    return (
      <div className={`${dark ? "pane" : "card"} flex flex-col justify-center gap-2 p-6`}>
        <strong className="text-[18px]">收到了</strong>
        <p className={`leading-7 ${dark ? "text-[15px] text-[color:var(--dim)]" : "small"}`}>
          有新功能、或你這個情境的使用指南寫好了，我們會寄給你。不會拿你的信箱做別的事，
          也隨時可以退訂。
        </p>
      </div>
    );

  return (
    <div className={`${dark ? "pane" : "card"} flex flex-col gap-4 p-6`}>
      <div>
        <strong className="text-[18px]">還在考慮？</strong>
        <p className={`mt-1 leading-7 ${dark ? "text-[15px] text-[color:var(--dim)]" : "small"}`}>留個信箱，我們把你這個情境的使用指南和新功能寄給你。不寄廣告。</p>
      </div>
      <label className="field">
        <span className={dark ? "text-[13px] text-[color:var(--dim)]" : "label"}>你主要在哪裡表演</span>
        <select className={dark ? "h-12 rounded-[10px] border border-[color:var(--line)] bg-[color:var(--night)] px-3 text-[15px] text-[color:var(--bone)]" : "input"} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="street">街頭、市集</option>
          <option value="venue">餐廳、酒吧駐唱或樂團</option>
          <option value="streamer">線上直播</option>
        </select>
      </label>
      <label className="field">
        <span className={dark ? "text-[13px] text-[color:var(--dim)]" : "label"}>Email</span>
        <input
          className={dark ? "h-12 rounded-[10px] border border-[color:var(--line)] bg-[color:var(--night)] px-3 text-[15px] text-[color:var(--bone)]" : "input"}
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === "err") setState("idle"); }}
          placeholder="you@example.com"
        />
      </label>
      {state === "err" && <p className="text-[14px] text-err">請填一個正確的 Email，或直接註冊開始用。</p>}
      <button onClick={send} disabled={state === "busy"} className={dark ? "sbtn sbtn-ghost w-full" : "btn btn-secondary"}>
        {state === "busy" ? "送出中…" : "寄給我"}
      </button>
    </div>
  );
}
