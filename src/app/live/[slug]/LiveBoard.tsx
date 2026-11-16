"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { PublicState, WallItem } from "@/lib/orders";
import { nt } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

function chime() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  [880, 1320, 1760].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.12);
    o.stop(ctx.currentTime + i * 0.12 + 0.5);
  });
}

/** 平板／電視大螢幕：正在唱、接下來、掃碼點歌、新點歌跳出 */
type Chat = { enabled: boolean; messages: { id: string; author: string; text: string; at: string }[]; top: { name: string; count: number }[] };

export function LiveBoard(props: { slug: string; name: string; color: string; avatar: string | null; appName: string; initial: PublicState; chatOn: boolean }) {
  const [s, setS] = useState(props.initial);
  const [chat, setChat] = useState<Chat | null>(null);
  const [pop, setPop] = useState<WallItem | null>(null);
  const [coins, setCoins] = useState<number[]>([]);
  const [sound, setSound] = useState(false);
  const seen = useRef(new Set(props.initial.wall.map((w) => w.id)));
  const soundRef = useRef(false);
  soundRef.current = sound;

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const j: PublicState | null = await fetch(`/api/p/${props.slug}/state`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (j && !stop) {
        const fresh = j.wall.filter((w) => !seen.current.has(w.id));
        if (fresh.length) {
          setPop(fresh[0]);
          setCoins(Array.from({ length: 14 }, (_, i) => Date.now() + i));
          if (soundRef.current) chime();
          setTimeout(() => setPop(null), 8000);
        }
        j.wall.forEach((w) => seen.current.add(w.id));
        setS(j);
      }
      if (!stop) setTimeout(poll, 3000);
    };
    poll();
    return () => { stop = true; };
  }, [props.slug]);

  // 直播聊天室（沒設定金鑰或沒在 YouTube 直播時不會有內容）
  useEffect(() => {
    if (!props.chatOn) return;
    let stop = false;
    const tick = async () => {
      const j = await fetch(`/api/p/${props.slug}/chat`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (j && !stop) setChat(j);
      if (!stop) setTimeout(tick, 6000);
    };
    tick();
    return () => { stop = true; };
  }, [props.slug, props.chatOn]);

  const playing = s.queue.find((q) => q.status === "playing");
  const next = s.queue.filter((q) => q.status === "waiting");

  return (
    <main className="night relative grid min-h-dvh gap-6 overflow-hidden p-6 md:grid-cols-[1fr_340px] md:p-10">
      {coins.map((c, i) => (
        <span key={c} className="spark" style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i % 7) * 0.15}s` }} onAnimationEnd={() => setCoins((x) => x.filter((v) => v !== c))} />
      ))}

      <section className="flex min-w-0 flex-col">
        <div className="flex items-center gap-4">
          <Avatar src={props.avatar} name={props.name} size={60} color="#2e2e32" />
          <div className="min-w-0">
            <div className="text-[32px] font-bold leading-10">{props.name}</div>
            <div className="text-[18px] text-white/55">{s.live?.location ? `${s.live.location}・` : ""}<span className="num">{s.followers}</span> 位粉絲・今天 <span className="num">{s.today.count}</span> 位支持</div>
          </div>
          <button onClick={() => { setSound((x) => !x); if (!sound) chime(); }} className="ml-auto rounded-[12px] border border-white/25 px-4 py-2 text-[14px] text-white/75">{sound ? "音效：開" : "音效：關"}</button>
        </div>

        <div className="flex flex-1 items-center py-8">
          {pop ? (
            <div key={pop.id} className="animate-pop max-w-4xl">
              <span className="tag tag-now !h-8 !px-3 !text-[16px]">{pop.itemTitle ? "新點歌" : "新支持"}</span>
              <div className="mt-4 text-[44px] font-bold leading-[1.2] md:text-[64px]">
                {pop.badge ? `${pop.badge} ` : ""}{pop.name} <span className="text-now">{pop.itemTitle ? `點了〈${pop.itemTitle}〉` : pop.amount != null ? `打賞 ${nt(pop.amount)}` : "打賞"}</span>
              </div>
              {pop.message && <div className="mt-5 text-[28px] leading-[1.4] text-white/85 md:text-[36px]">「{pop.message}」</div>}
            </div>
          ) : playing ? (
            <div className="max-w-4xl">
              <div className="flex items-center gap-3 text-[22px] text-white/60"><span className="dot-now !h-3 !w-3" />正在唱</div>
              <div className="mt-3 text-[56px] font-bold leading-[1.15] md:text-[88px]">{playing.title}</div>
              <div className="mt-4 text-[26px] text-white/80">{playing.badge ? `${playing.badge} ` : ""}{playing.name} 點播</div>
              {playing.message && <div className="mt-2 text-[24px] text-white/65">「{playing.message}」</div>}
            </div>
          ) : (
            <div className="text-[36px] font-bold leading-[1.3] text-white/60">{s.live ? "掃右邊的 QR，點下一首" : "休息中。追蹤後，下次開演會通知你"}</div>
          )}
        </div>

        <div>
          <div className="mb-2 text-[18px] text-white/55">接下來 <span className="num">{next.length}</span> 首</div>
          <div className="flex gap-3 overflow-hidden">
            {next.slice(0, 5).map((q, i) => (
              <div key={q.id} className="panel min-w-48 px-4 py-3">
                <div className="num text-[15px] text-white/55">{i + 1}・{q.name}</div>
                <div className="truncate text-[22px] font-bold leading-8">{q.title}</div>
              </div>
            ))}
            {!next.length && <div className="text-[22px] text-white/40">還沒有人排隊</div>}
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-[20px] bg-[#fbfaf6] p-5 text-center text-[#151412]">
          <img src={`/api/qr/${props.slug}`} alt="點歌 QR Code" className="mx-auto w-full max-w-[240px]" />
          <div className="mt-3 text-[24px] font-bold leading-8">掃碼點歌、打賞</div>
          <div className="text-[16px] text-[#4b4740]">看歌單，選了就排隊</div>
        </div>
        {s.top.length > 0 && (
          <div className="panel p-4">
            <div className="mb-2 text-[16px] text-white/55">本場支持排行</div>
            <ol className="flex flex-col gap-2">
              {s.top.map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-[18px]">
                  <span className={`num w-6 text-center font-bold ${i === 0 ? "text-now" : "text-white/55"}`}>{i + 1}</span>
                  <Avatar src={t.avatar} name={t.name} size={30} color="#2e2e32" />
                  <span className="min-w-0 flex-1 truncate font-bold">{t.badge ? `${t.badge} ` : ""}{t.name}</span>
                  {t.total != null && <span className="num text-white/75">{nt(t.total)}</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
        {chat && chat.messages.length > 0 && (
          <div className="panel p-4">
            <div className="mb-2 flex items-baseline justify-between text-[16px] text-white/55"><span>直播聊天室</span>{chat.top[0] && <span className="num">最熱：{chat.top[0].name}</span>}</div>
            <ul className="flex flex-col gap-1.5">
              {chat.messages.slice(0, 5).map((m) => (
                <li key={m.id} className="truncate text-[16px]"><span className="font-bold text-white/80">{m.author}</span> <span className="text-white/60">{m.text}</span></li>
              ))}
            </ul>
          </div>
        )}
        <div className="panel flex-1 overflow-hidden p-4">
          <div className="mb-3 text-[16px] text-white/55">最新支持</div>
          <ul className="flex flex-col gap-3">
            {s.wall.slice(0, 6).map((w) => (
              <li key={w.id} className="flex items-center gap-3">
                <Avatar src={w.avatar} name={w.name} size={30} color="#2e2e32" />
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-bold">{w.name}<span className="ml-2 font-medium text-white/65">{w.itemTitle ? `〈${w.itemTitle}〉` : w.amount != null ? nt(w.amount) : "打賞"}</span></div>
                  {w.message && <div className="truncate text-[14px] text-white/55">{w.message}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-center text-[13px] text-white/35">{props.appName}</div>
      </aside>
    </main>
  );
}
