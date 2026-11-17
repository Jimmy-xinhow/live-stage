"use client";

import { IconRequest } from "@/components/icons";
import { Floaters, LANE, LANE_INK, useBumps } from "./bits";

/**
 * 歌曲賽跑：幾首歌排成跑道，先衝過終點的那首就唱。
 * 每條跑道有自己的跑者與名次，終點是格子旗——一眼看得出這是比賽，不是統計圖。
 */
export function Race({ lanes, goal, safe }: { lanes: { name: string; score: number; players: number; top: { name: string; score: number }[] }[]; goal: number; safe?: boolean }) {
  const bumps = useBumps(lanes.map((l) => l.score));
  const ranked = [...lanes].map((l, i) => ({ ...l, i })).sort((a, b) => b.score - a.score);
  const rank = (i: number) => ranked.findIndex((r) => r.i === i) + 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-evenly gap-[1.4vh] py-[1vh]">
      {lanes.map((l, i) => {
        const pct = Math.min(100, goal ? (l.score / goal) * 100 : 0);
        const lead = rank(i) === 1 && l.score > 0;
        return (
          <div key={i} className="relative grid grid-cols-[16vw_minmax(0,1fr)_7vw] items-center gap-[1.2vw]">
            <div className="min-w-0">
              <div className="flex items-center gap-[0.6vw]">
                <span className="num flex h-[2.4vw] w-[2.4vw] shrink-0 items-center justify-center rounded-[8px] text-[1.3vw] font-black" style={{ background: lead ? LANE[i] : "#23303d", color: lead ? LANE_INK[i] : "#9ba6b4" }}>{rank(i)}</span>
                <span className="truncate text-[2vw] leading-tight font-black">{l.name}</span>
              </div>
              <div className="truncate text-[1.15vw] text-[#9ba6b4]">{l.players} 人在推{l.top[0] ? `　推最多：${l.top[0].name}` : ""}</div>
            </div>

            <div className="relative h-[10vh] rounded-[16px] border border-[#2b3542] bg-[#151b24]">
              {/* 跑道線 */}
              <div className="absolute inset-y-0 right-[4vh] left-0 opacity-25" style={{ background: "repeating-linear-gradient(90deg, transparent 0 4vh, #9ba6b4 4vh 4.1vh)" }} />
              {/* 終點格子旗 */}
              <div className="absolute inset-y-[0.7vh] right-[0.7vh] w-[3vh] rounded-[9px]" style={{ background: "repeating-conic-gradient(#f2efe9 0 25%, #0d1117 0 50%) 0 0/1.3vh 1.3vh" }} />
              {/* 跑者 */}
              <div className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out" style={{ left: `calc(${pct * 0.84}% + 0.8vh)` }}>
                <div className="flex h-[7.4vh] w-[7.4vh] items-center justify-center rounded-full border-[0.4vh] border-[#0d1117] text-[3.4vh] shadow-[0_0_3vh_rgba(0,0,0,.5)]" style={{ background: LANE[i] }}>
                  <IconRequest size={26} style={{ color: LANE_INK[i] }} />
                </div>
              </div>
              <Floaters bumps={bumps} lane={i} className="!left-auto !right-[12%]" />
            </div>

            <div className="num text-right text-[1.9vw] font-black">
              {safe ? "" : l.score.toLocaleString()}
              <span className="block text-[1vw] font-semibold text-[#6b7684]">/ {goal.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
