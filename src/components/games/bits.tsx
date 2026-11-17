"use client";

import { useEffect, useRef, useState } from "react";

import { LANE_COLORS } from "../gameui";

/** 唯一一份隊伍配色，手機與大螢幕共用 */
export const LANE = LANE_COLORS;
export const LANE_INK = ["#15110a", "#ffffff", "#06171b", "#ffffff"];

/**
 * 偵測分數變化，吐出會往上飄的數字。
 * 大螢幕上最重要的回饋就是「剛剛有人出手了」，光看總分變大看不出來。
 */
export function useBumps(scores: number[]) {
  const prev = useRef(scores);
  const [bumps, setBumps] = useState<{ key: number; lane: number; n: number }[]>([]);
  useEffect(() => {
    const add: { key: number; lane: number; n: number }[] = [];
    scores.forEach((s, i) => {
      const d = s - (prev.current[i] ?? s);
      if (d > 0) add.push({ key: Date.now() + i * 0.001 + Math.random(), lane: i, n: d });
    });
    prev.current = scores;
    if (!add.length) return;
    setBumps((b) => [...b, ...add].slice(-14));
    const t = setTimeout(() => setBumps((b) => b.filter((x) => !add.includes(x))), 1500);
    return () => clearTimeout(t);
  }, [scores.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return bumps;
}

/** 往上飄的 +N */
export function Floaters({ bumps, lane, className = "" }: { bumps: { key: number; lane: number; n: number }[]; lane: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-visible ${className}`} aria-hidden>
      {bumps.filter((b) => b.lane === lane).map((b, i) => (
        <span
          key={b.key}
          className="num absolute left-1/2 top-1/2 animate-floatup text-[2.6vh] leading-none font-black"
          style={{ color: LANE[lane % LANE.length], marginLeft: `${((i % 5) - 2) * 2.4}vh` }}
        >
          +{b.n.toLocaleString()}
        </span>
      ))}
    </div>
  );
}

/** 大螢幕共用頁首：左邊遊戲名與獎勵、中間倒數、右邊加入用的 QR */
export function GameHead({ title, sub, timer, qr, safe }: { title: string; sub: string; timer?: React.ReactNode; qr: string | null; safe?: boolean }) {
  return (
    <div className="flex items-center gap-[2vw]">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[1.5vw] text-[#9ba6b4]">{sub}</div>
        <div className="text-[3.4vw] leading-tight font-black tracking-[-0.03em]">{title}</div>
      </div>
      {timer}
      {qr && !safe && (
        <div className="flex items-center gap-[1vw] rounded-[20px] bg-white p-[0.8vw] text-[#0E0E0F]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="掃碼加入" className="h-[5.4vw] w-[5.4vw]" />
          <strong className="pr-[0.5vw] text-[1.25vw] leading-tight">掃碼<br />加入</strong>
        </div>
      )}
    </div>
  );
}

export function Clock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bc rounded-[20px] px-[2vw] py-[1vh] text-center">
      <div className="text-[1.1vw] text-[#9ba6b4]">{label}</div>
      <div className="bc-num text-[3.4vw] leading-none">{value}</div>
    </div>
  );
}

/** 貢獻前三名。大螢幕上唸得到名字是觀眾最想要的東西 */
export function TopThree({ top, color, safe }: { top: { name: string; score: number }[]; color: string; safe?: boolean }) {
  return (
    <div className="bc bc-edge rounded-[20px] p-[1.2vw]" style={{ "--edge": color } as React.CSSProperties}>
      <div className="mb-[0.5vh] text-[1.15vw] font-bold" style={{ color }}>出力最多的三位</div>
      {top.length ? (
        top.map((t, k) => (
          <div key={k} className="flex items-center gap-[0.9vw] py-[0.25vh] text-[1.7vw]">
            <span className="num flex h-[2.2vw] w-[2.2vw] shrink-0 items-center justify-center rounded-[7px] text-[1.15vw] font-black" style={k === 0 ? { background: color, color: "#0d1117" } : { background: "#23303d" }}>{k + 1}</span>
            <strong className="min-w-0 flex-1 truncate">{t.name}</strong>
            {!safe && <span className="num text-[#9ba6b4]">{t.score.toLocaleString()}</span>}
          </div>
        ))
      ) : (
        <div className="py-[0.5vh] text-[1.4vw] text-[#6b7684]">還沒有人出手</div>
      )}
    </div>
  );
}
