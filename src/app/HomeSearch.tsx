"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACTS, OCCASIONS } from "@/lib/acts";
import { AREAS } from "@/lib/areas";

export function HomeSearch() {
  const [mode, setMode] = useState<"watch" | "book">("watch");
  const [act, setAct] = useState("");
  const [city, setCity] = useState("");
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [q, setQ] = useState("");
  const router = useRouter();
  const w = mode === "watch";
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (act) sp.set("act", act);
    if (city) sp.set("city", city);
    if (w) { if (q) sp.set("q", q); router.push(`/find?${sp}`); }
    else { sp.set("occasion", occasion); router.push(`/invite?${sp}`); }
  };
  const tab = (on: boolean) => `pb-1.5 border-b-2 ${on ? "border-ink font-bold" : "border-transparent text-ink3"}`;
  return (
    <section className="py-10 md:py-16">
      <div role="tablist" aria-label="你想做什麼" className="flex gap-7">
        <button role="tab" aria-selected={w} onClick={() => setMode("watch")} className={tab(w)}>去看表演</button>
        <button role="tab" aria-selected={!w} onClick={() => setMode("book")} className={tab(!w)}>請人來表演</button>
      </div>
      <h1 className="h-display mt-6">{w ? "今晚，誰在附近表演" : "婚禮、尾牙、餐廳駐唱，找對的表演者"}</h1>
      <p className="mt-3 max-w-[600px] text-[17px] leading-[30px] text-ink2">
        {w ? "街頭、駐唱、樂團的即時演出與一週行程。到了現場，掃 QR 就能點歌、打賞、一起玩。" : "先看真實演出紀錄與歌單再決定。需求免費送出，報價傳到你的 LINE，平台不抽成。"}
      </p>
      <form onSubmit={go} className="mt-8 grid items-end gap-4 md:grid-cols-12 md:gap-6">
        {w ? (
          <label className="field md:col-span-4">名字或曲風<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="例：爵士、Mia" /></label>
        ) : (
          <label className="field md:col-span-4">活動場合<select value={occasion} onChange={(e) => setOccasion(e.target.value)}>{OCCASIONS.map((o) => <option key={o}>{o}</option>)}</select></label>
        )}
        <label className="field md:col-span-3">表演類型<select value={act} onChange={(e) => setAct(e.target.value)}><option value="">全部類型</option>{ACTS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
        <label className="field md:col-span-3">地區<select value={city} onChange={(e) => setCity(e.target.value)}><option value="">全台</option>{AREAS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
        <button className="btn btn-primary md:col-span-2">{w ? "找表演" : "取得報價"}</button>
      </form>
    </section>
  );
}
