"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nt } from "@/lib/format";
import { PageHead } from "@/components/back/Shell";

type Item = { id: string; title: string; subtitle: string; category: string; price: number; enabled: boolean; requestCount: number };

/** 解析批次貼上：每行「歌名 / 歌手 / 分類 / 價格」，分隔可用 / ， , 或 Tab */
function parseBulk(text: string, defaultPrice: number) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/\s*[\/｜|,，\t]\s*/).filter(Boolean);
      const last = parts[parts.length - 1];
      const price = /^\d+$/.test(last ?? "") ? Number(parts.pop()) : defaultPrice;
      return { title: parts[0] ?? "", subtitle: parts[1] ?? "", category: parts[2] ?? "", price };
    })
    .filter((x) => x.title);
}

export function MenuEditor({ items }: { items: Item[] }) {
  const router = useRouter();
  const [bulk, setBulk] = useState("");
  const [price, setPrice] = useState(100);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = parseBulk(bulk, price);

  const add = async () => {
    setBusy(true);
    const r = await fetch("/api/dashboard/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: preview }) });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? `已加入 ${j.added} 項` : j.error);
    if (r.ok) { setBulk(""); router.refresh(); }
  };
  const patch = async (id: string, body: object) => {
    await fetch(`/api/dashboard/menu/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("刪除這個項目？")) return;
    await fetch(`/api/dashboard/menu/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHead title="歌單與服務" desc="只放你真的會的，觀眾就不會點到你不會的歌。" />
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="h3">新增</h2>
        <label className="field">一行一項，可以整份貼上：歌名 / 歌手 / 分類 / 價格（後三項可省略）
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} placeholder={"晴天 / 周杰倫 / 華語 / 100\n家後 / 江蕙 / 台語 / 150\n生日快樂歌＋喊名字 / / 特別服務 / 200"} />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="field w-40">沒填價格時（NT$）<input className="num" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
          <button disabled={busy || !preview.length} onClick={add} className="btn btn-primary ml-auto">加入{preview.length ? ` ${preview.length} 項` : ""}</button>
        </div>
        {msg && <p className="text-[14px] text-ok">{msg}</p>}
      </section>

      <section className="sec">
        <h2 className="h2">我的歌單 <span className="num text-ink3">{items.length}</span></h2>
        <p className="small">今天唱不了的歌，取消「可點」就好，不用刪除。</p>
        <ul className="mt-2 border-t border-rule">
          {items.map((m) => (
            <li key={m.id} className="row flex min-h-[64px] items-center gap-3 py-2.5">
              <label className="small flex shrink-0 items-center gap-1.5">
                <input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={m.enabled} onChange={(e) => patch(m.id, { enabled: e.target.checked })} />可點
              </label>
              <div className={`min-w-0 flex-1 ${m.enabled ? "" : "opacity-45"}`}>
                <strong className="block truncate">{m.title}</strong>
                <div className="small truncate">{[m.subtitle, m.category].filter(Boolean).join("・")}{m.requestCount ? `・被點 ${m.requestCount} 次` : ""}</div>
              </div>
              <span className="small shrink-0">NT$</span>
              <input
                type="number"
                defaultValue={m.price}
                onBlur={(e) => Number(e.target.value) !== m.price && Number(e.target.value) > 0 && patch(m.id, { price: Number(e.target.value) })}
                className="input num !min-h-[40px] !w-20 shrink-0 text-right"
                aria-label={`${m.title} 價格`}
              />
              <button onClick={() => remove(m.id)} className="small shrink-0 underline">刪除</button>
            </li>
          ))}
          {!items.length && <li className="small py-8 text-center">還沒有歌單。先貼上你最拿手的 20 首。</li>}
        </ul>
        {items.length > 0 && <p className="small mt-3">最低價 {nt(Math.min(...items.map((i) => i.price)))}，觀眾可以自行加碼。</p>}
      </section>
    </div>
  );
}
