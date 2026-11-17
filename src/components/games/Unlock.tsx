"use client";

import { Floaters, useBumps } from "./bits";

/**
 * 集氣解鎖：全場一起累積到目標金額，就解鎖表演者先講好的那件事。
 * 做成一個上鎖的箱子，達標才打開——在那之前故意不講裡面是什麼的話，
 * 表演者可以留懸念；有講的話就寫在鎖上。
 */
export function Unlock({ lane, goal, reward, safe }: { lane: { name: string; score: number; players: number }; goal: number; reward: string; safe?: boolean }) {
  const pct = Math.min(100, goal ? (lane.score / goal) * 100 : 0);
  const open = pct >= 100;
  const bumps = useBumps([lane.score]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[2.4vh]">
      <div className="relative">
        <svg viewBox="0 0 100 96" style={{ width: "30vh" }} aria-hidden>
          <defs>
            <clipPath id="fill"><rect x="0" y={96 - (pct / 100) * 60} width="100" height="96" /></clipPath>
          </defs>
          {/* 鎖環：開了就彈起來 */}
          <path
            d={open ? "M30 36V24a20 20 0 0 1 36-12" : "M30 36V26a20 20 0 0 1 40 0v10"}
            fill="none"
            stroke={open ? "#4ade80" : "#5a6775"}
            strokeWidth="7"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          <rect x="16" y="36" width="68" height="60" rx="12" fill="#1c242f" stroke="#0d1117" strokeWidth="3" />
          <g clipPath="url(#fill)">
            <rect x="16" y="36" width="68" height="60" rx="12" fill={open ? "#4ade80" : "#ffb03a"} className="transition-all duration-700" />
          </g>
          <circle cx="50" cy="62" r="7" fill="#0d1117" />
          <rect x="47" y="62" width="6" height="16" rx="3" fill="#0d1117" />
        </svg>
        <Floaters bumps={bumps} lane={0} />
      </div>

      <div className="w-[62%] text-center">
        <div className="num text-[4.4vw] leading-none font-black" style={{ color: open ? "#4ade80" : "#ffb03a" }}>
          {safe ? `${Math.round(pct)}%` : `NT$${lane.score.toLocaleString()}`}
        </div>
        <div className="mt-[0.6vh] text-[1.5vw] text-[#9ba6b4]">
          {open ? "達標了" : `目標 NT$${goal.toLocaleString()}　還差 NT$${Math.max(0, goal - lane.score).toLocaleString()}`}
          {lane.players > 0 && `　${lane.players} 人支持過`}
        </div>
      </div>

      {reward && (
        <div className={`rounded-[22px] px-[3vw] py-[1.4vh] text-center ${open ? "animate-pop bg-[#4ade80] text-[#07210f]" : "border-2 border-[#2b3542] text-[#9ba6b4]"}`}>
          <div className="text-[1.3vw] font-bold">{open ? "解鎖" : "達標就"}</div>
          <div className={`text-[2.8vw] leading-tight font-black ${open ? "" : "text-[#f2efe9]"}`}>{reward}</div>
        </div>
      )}
    </div>
  );
}
