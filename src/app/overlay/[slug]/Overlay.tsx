"use client";

import { useEffect, useState } from "react";
import type { PublicState } from "@/lib/orders";
import type { PublicGame } from "@/lib/games";
import type { HubState } from "@/lib/hub";
import { GameView } from "@/components/GameView";

/** 完整模式：通知、排隊、排行、掃碼。安全模式（TikTok、17LIVE）：不顯示金額、QR 與支持提示 */
type Chat = { enabled: boolean; messages: { id: string; author: string; text: string }[]; top: { name: string; count: number }[] };

export function Overlay({ slug, name, safe, preview, chatOn }: { slug: string; name: string; safe: boolean; preview: boolean; chatOn: boolean }) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [st, setSt] = useState<PublicState | null>(null);
  const [hub, setHub] = useState<HubState | null>(null);
  const [g, setG] = useState<PublicGame | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const load = async () => {
      setNow(Date.now());
      const [a, b, c] = await Promise.all([fetch(`/api/p/${slug}/state`), fetch(`/api/p/${slug}/hub`), fetch(`/api/p/${slug}/game`)]);
      if (a.ok) setSt(await a.json());
      if (b.ok) setHub(await b.json());
      if (c.ok) setG((await c.json()).game);
    };
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [slug]);

  useEffect(() => {
    if (!chatOn) return;
    const load = async () => {
      const r = await fetch(`/api/p/${slug}/chat`, { cache: "no-store" });
      if (r.ok) setChat(await r.json());
    };
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [slug, chatOn]);
  if (!st) return null;
  const box = "rounded-[1vw] bg-[#0E0E0F]/90 text-[#F2EFE8]";
  if (g && g.status === "running") return <div className={`h-dvh w-screen ${preview ? "bg-[#2B2F36]" : ""}`}><div className="night h-full bg-[#0E0E0F]/90"><GameView g={g} now={now} qr={`/api/qr/${slug}`} safe={safe} /></div></div>;
  const playing = st.queue.find((q) => q.status === "playing");
  const waiting = st.queue.filter((q) => q.status === "waiting").slice(0, 4);
  const latest = st.wall[0] && now - new Date(st.wall[0].paidAt).getTime() < 20_000 ? st.wall[0] : null;
  return (
    <div className={`relative h-dvh w-screen overflow-hidden ${preview ? "bg-[#2B2F36]" : ""}`} style={{ fontFamily: "var(--font-sans)" }}>
      <div className={`absolute top-[4vh] left-[2.5vw] px-[1.5vw] py-[1.4vh] ${box}`}><div className="text-[1.1vw] text-[#B9B5AC]">{playing ? "正在唱" : name}</div><div className="text-[1.9vw] font-bold">{playing ? playing.title : st.live ? "演出中" : "尚未開演"}</div></div>
      {!safe && latest && (
        <div className="absolute top-[4vh] right-[2.5vw] w-[33vw] rounded-[1.2vw] bg-[#FF6A3D] px-[1.6vw] py-[1.6vh] text-[#0E0E0F]"><div className="text-[1.2vw] font-bold">{latest.kind === "request" ? "新點歌" : "新的支持"}</div><div className="text-[2.2vw] leading-tight font-bold">{latest.name}{latest.itemTitle ? `〈${latest.itemTitle}〉` : ""}{latest.amount ? ` NT$${latest.amount}` : ""}</div>{latest.message && <div className="text-[1.4vw]">{latest.message}</div>}</div>
      )}
      {waiting.length > 0 && (
        <div className={`absolute top-[20vh] left-[2.5vw] w-[26vw] px-[1.5vw] py-[1.6vh] ${box}`}><div className="mb-[0.6vh] text-[1.4vw] font-bold">接下來</div>{waiting.map((q, i) => <div key={q.id} className="flex gap-[0.8vw] py-[0.3vh] text-[1.4vw]"><span className="num text-[#8E8A81]">{i + 1}</span><span className="flex-1">{q.title}</span><span className="text-[1.1vw] text-[#B9B5AC]">{q.name}</span></div>)}</div>
      )}
      {hub && hub.live && hub.hype > 0 && (
        <div className={`absolute bottom-[14vh] left-[2.5vw] w-[26vw] px-[1.5vw] py-[1.2vh] ${box}`}><div className="flex justify-between text-[1.1vw]"><span>應援</span><span className="num">{hub.hype}%</span></div><div className="mt-[0.5vh] h-[1vh] overflow-hidden rounded-full bg-[#232326]"><div className="h-full rounded-full bg-[#FF6A3D]" style={{ width: `${hub.hype}%` }} /></div></div>
      )}
      {chat && chat.messages.length > 0 && (
        <div className={`absolute right-[2.5vw] top-[20vh] w-[26vw] px-[1.5vw] py-[1.2vh] ${box}`}>
          <div className="mb-[0.6vh] text-[1.2vw] text-[#B9B5AC]">直播聊天室</div>
          {chat.messages.slice(0, 4).map((m) => (
            <div key={m.id} className="truncate py-[0.2vh] text-[1.3vw]"><span className="font-bold">{m.author}</span> <span className="text-[#B9B5AC]">{m.text}</span></div>
          ))}
        </div>
      )}
      {st.top.length > 0 && (
        <div className="absolute bottom-[4vh] left-[2.5vw] flex gap-[0.8vw]">{st.top.map((t, i) => <div key={i} className={`flex items-center gap-[0.8vw] px-[1.2vw] py-[1vh] ${box}`}><span className={`num text-[1.6vw] font-extrabold ${i ? "text-[#8E8A81]" : "text-[#FF6A3D]"}`}>{i + 1}</span><strong className="text-[1.4vw]">{t.name}</strong></div>)}</div>
      )}
      {!safe && (
        <div className="absolute right-[2.5vw] bottom-[4vh] flex items-center gap-[1vw] rounded-[1.2vw] bg-white p-[0.9vw] text-[#0E0E0F]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/qr/${slug}`} alt="" className="h-[8vw] w-[8vw]" /><div className="pr-[0.8vw]"><div className="text-[1.7vw] font-bold">掃碼點歌・支持</div><div className="text-[1.1vw] text-[#4B4740]">線上、現場一起排隊</div></div></div>
      )}
    </div>
  );
}
