"use client";

import { useCallback, useEffect, useState } from "react";
import { nt, timeAgo } from "@/lib/format";

type Item = { id: string; code: string; amount: number; name: string; itemTitle: string | null; message: string; claimed: boolean; expired: boolean; createdAt: string };

/** 待確認的轉帳：藝人對照 LINE Pay 入帳通知的備註碼，按「已收到」 */
export function PendingPayments({ onChange }: { onChange?: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const j = await fetch("/api/dashboard/manual", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (j?.items) setItems(j.items);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (it: Item, action: "confirm" | "reject", amount?: number) => {
    setBusy(it.id);
    setErr("");
    const r = await fetch(`/api/dashboard/manual/${it.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, amount }) });
    if (!r.ok) setErr((await r.json()).error ?? "失敗");
    setBusy(null);
    await load();
    onChange?.();
  };

  if (!items.length) return null;
  return (
    <section className="rounded-[20px] border-2 border-now bg-raised p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="h3">待確認收款 <span className="num">{items.length}</span></h2>
        <span className="small">對照入帳通知裡的備註碼</span>
      </div>
      {err && <p className="mt-2 text-[14px] text-err">{err}</p>}
      <ul className="mt-2">
        {items.map((it) => (
          <li key={it.id} className={`border-t border-rule py-3 ${it.expired ? "opacity-70" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="num text-[30px] font-bold leading-9 tracking-[.12em]">{it.code}</span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate"><span className="num">{nt(it.amount)}</span>・{it.name}</strong>
                <div className="small truncate">{it.itemTitle ? `〈${it.itemTitle}〉` : "打賞"}{it.message ? `・${it.message}` : ""}・{timeAgo(it.createdAt)}</div>
              </div>
              {it.claimed && <span className="tag tag-now shrink-0">說已付款</span>}
              {it.expired && <span className="tag tag-quiet shrink-0">已逾時</span>}
            </div>
            <div className="mt-2 flex gap-2">
              <button disabled={busy === it.id} onClick={() => act(it, "confirm")} className="btn btn-primary btn-sm flex-1">已收到</button>
              <button
                disabled={busy === it.id}
                onClick={() => {
                  const v = prompt(`實際收到多少？（點歌碼 ${it.code}）`, String(it.amount));
                  if (v && Number(v) > 0) act(it, "confirm", Math.round(Number(v)));
                }}
                className="btn btn-quiet btn-sm"
              >
                金額不同
              </button>
              <button disabled={busy === it.id} onClick={() => confirm(`確定沒收到 ${it.code}？觀眾會收到取消通知`) && act(it, "reject")} className="btn btn-quiet btn-sm">沒收到</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="small mt-1">也可以直接在 LINE 官方帳號輸入 4 碼點歌碼確認。</p>
    </section>
  );
}
