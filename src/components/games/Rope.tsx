"use client";

import { Floaters, LANE, useBumps } from "./bits";

/**
 * 拔河：真的畫一條繩子。
 * 繩結的位置就是兩隊的分差，推到自己這邊的勝利線就贏。
 * 之前這裡是一條進度條，看的人不知道那是什麼。
 */
export function Rope({ lanes, goal, safe }: { lanes: { name: string; score: number; players: number }[]; goal: number; safe?: boolean }) {
  const diff = lanes[0].score - lanes[1].score;
  const ratio = Math.max(-1, Math.min(1, diff / (goal || 1)));
  // 繩結在 50%，往贏的那邊偏最多 38%，留空間給兩端的隊伍
  const knot = 50 - ratio * 38;
  const bumps = useBumps(lanes.map((l) => l.score));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-center">
      <div className="mb-[2.5vh] grid grid-cols-2 gap-[2vw]">
        {lanes.map((l, i) => (
          <div key={i} className={`relative ${i ? "text-right" : ""}`}>
            <div className="text-[1.3vw] text-[#9ba6b4]">{l.players} 人在拉</div>
            <div className="truncate text-[3vw] leading-tight font-black" style={{ color: LANE[i] }}>{l.name}</div>
            {!safe && <div className="num text-[2.2vw] leading-none font-bold text-[#9ba6b4]">{l.score.toLocaleString()}</div>}
            <Floaters bumps={bumps} lane={i} />
          </div>
        ))}
      </div>

      <div className="relative h-[20vh]">
        {/* 勝利線 */}
        {[12, 88].map((x, i) => (
          <div key={x} className="absolute top-[3vh] bottom-[3vh] w-[0.5vh] rounded-full" style={{ left: `${x}%`, background: LANE[i], opacity: 0.5 }} />
        ))}
        <div className="absolute top-[1vh] left-[12%] -translate-x-1/2 text-[1.1vw] font-bold" style={{ color: LANE[0] }}>勝利線</div>
        <div className="absolute top-[1vh] left-[88%] -translate-x-1/2 text-[1.1vw] font-bold" style={{ color: LANE[1] }}>勝利線</div>

        {/* 繩子本體：兩段不同顏色，交界就是繩結 */}
        <div className="absolute top-1/2 right-[4%] left-[4%] h-[1.7vh] -translate-y-1/2 overflow-hidden rounded-full bg-[#23303d]">
          <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${knot}%`, background: `repeating-linear-gradient(115deg, ${LANE[0]} 0 1.1vh, ${LANE[0]}bb 1.1vh 2.2vh)` }} />
          <div className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out" style={{ width: `${100 - knot}%`, background: `repeating-linear-gradient(65deg, ${LANE[1]} 0 1.1vh, ${LANE[1]}bb 1.1vh 2.2vh)` }} />
        </div>

        {/* 繩結 */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left: `${4 + knot * 0.92}%` }}
        >
          <div className="flex h-[7vh] w-[7vh] items-center justify-center rounded-full border-[0.5vh] border-[#0d1117] bg-[#f2efe9] text-[2.4vh] font-black text-[#0d1117] shadow-[0_0_4vh_rgba(242,239,233,.45)]">
            {Math.abs(diff) > 0 ? (diff > 0 ? "◀" : "▶") : "●"}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 text-center text-[1.4vw] text-[#9ba6b4]">
          {Math.abs(diff) === 0 ? "勢均力敵" : `${lanes[diff > 0 ? 0 : 1].name} 領先 ${Math.abs(diff).toLocaleString()}　還差 ${Math.max(0, goal - Math.abs(diff)).toLocaleString()} 就贏`}
        </div>
      </div>
    </div>
  );
}
