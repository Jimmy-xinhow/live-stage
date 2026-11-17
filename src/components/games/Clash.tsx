"use client";

import { IconTroops } from "@/components/icons";
import { Floaters, LANE, useBumps } from "./bits";

/**
 * 兵團對戰與跨表演者 PK：兩軍對推，中間有一條戰線。
 * 戰線往哪邊移動就是哪邊快輸了。兵力用旗子堆出來，看得到「人多勢眾」，
 * 不是兩個數字。打到的那一瞬間整條戰線會閃。
 */
export function Clash({ lanes, pk, safe }: { lanes: { name: string; score: number; players: number; top: { name: string; score: number }[] }[]; pk?: boolean; safe?: boolean }) {
  const total = lanes[0].score + lanes[1].score || 1;
  const front = Math.max(12, Math.min(88, (lanes[0].score / total) * 100));
  const bumps = useBumps(lanes.map((l) => l.score));
  const hit = bumps.length > 0;
  // 旗子數量跟著分數走，但封頂，免得畫面爆掉
  const flags = (s: number) => Math.min(18, Math.round(Math.sqrt(Math.max(0, s)) / 2.6));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-[2vh]">
      <div className="grid grid-cols-2 gap-[2vw]">
        {lanes.map((l, i) => (
          <div key={i} className={`relative ${i ? "text-right" : ""}`}>
            <div className="text-[1.25vw] text-[#9ba6b4]">{pk ? "表演者" : "隊伍"}・{l.players} 人</div>
            <div className="truncate text-[3.1vw] leading-tight font-black" style={{ color: LANE[i] }}>{l.name}</div>
            {!safe && <div className="num text-[3.4vw] leading-none font-black">{l.score.toLocaleString()}</div>}
            <Floaters bumps={bumps} lane={i} />
          </div>
        ))}
      </div>

      {/* 戰場 */}
      <div className={`relative h-[17vh] overflow-hidden rounded-[18px] border-2 border-[#2b3542] bg-[#11161d] ${hit ? "animate-hit" : ""}`}>
        <div className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out" style={{ width: `${front}%`, background: `linear-gradient(90deg, ${LANE[0]}2e, ${LANE[0]}10)` }} />
        <div className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out" style={{ width: `${100 - front}%`, background: `linear-gradient(270deg, ${LANE[1]}2e, ${LANE[1]}10)` }} />

        {/* 兩軍貼著戰線站，才看得出來是在推擠，不是各站一邊 */}
        {[0, 1].map((i) => (
          <div
            key={i}
            className="absolute bottom-[2.4vh] flex items-end gap-[0.45vh] transition-all duration-700 ease-out"
            style={i === 0 ? { right: `calc(${100 - front}% + 1vh)`, flexDirection: "row-reverse" } : { left: `calc(${front}% + 1vh)` }}
          >
            {Array.from({ length: flags(lanes[i].score) }).map((_, k) => (
              <span key={k} className="block w-[0.9vh] rounded-t-[2px]" style={{ height: `${3.4 + (k % 3) * 0.9}vh`, background: LANE[i], opacity: 0.9 - (k % 3) * 0.12 }} />
            ))}
          </div>
        ))}

        {/* 戰線 */}
        <div className="absolute inset-y-0 w-[0.6vh] -translate-x-1/2 transition-[left] duration-700 ease-out" style={{ left: `${front}%`, background: "#f2efe9", boxShadow: "0 0 3vh rgba(242,239,233,.6)" }}>
          <div className={`absolute top-1/2 left-1/2 h-[6vh] w-[6vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.35vh] border-[#0d1117] bg-[#f2efe9] ${hit ? "animate-shake" : ""}`}>
            <IconTroops size={22} className="absolute inset-0 m-auto text-[#0d1117]" />
          </div>
        </div>
      </div>

      <div className="text-center text-[1.4vw] text-[#9ba6b4]">
        {lanes[0].score === lanes[1].score ? "勢均力敵，誰都還沒贏" : `${lanes[lanes[0].score > lanes[1].score ? 0 : 1].name} 領先 ${Math.abs(lanes[0].score - lanes[1].score).toLocaleString()}`}
      </div>
    </div>
  );
}
