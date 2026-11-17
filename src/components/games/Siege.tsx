"use client";

import { Floaters, useBumps } from "./bits";

/**
 * 攻城魔王戰：全場一起打一個魔王。
 * 重點是血條要「掉」不是「漲」——看的人要感覺得出來快打完了。
 * 魔王會隨血量變色、受擊時抖一下，打倒了才公布獎勵。
 */
export function Siege({ lane, goal, reward, safe }: { lane: { name: string; score: number; players: number }; goal: number; reward: string; safe?: boolean }) {
  const hp = Math.max(0, goal - lane.score);
  const pct = goal ? (hp / goal) * 100 : 100;
  const dead = hp <= 0;
  const bumps = useBumps([lane.score]);
  const hurt = bumps.length > 0;
  const mood = dead ? "#4ade80" : pct < 25 ? "#ff4f1f" : pct < 60 ? "#ffb03a" : "#e8356d";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[2vh]">
      <div className={`relative ${hurt ? "animate-shake" : ""}`}>
        <svg viewBox="0 0 120 110" style={{ width: "30vh" }} className={hurt ? "animate-hit" : ""} aria-hidden>
          {/* 城牆 */}
          <path d="M10 104h100V58H98v-8H84v8H70v-8H50v8H36v-8H22v8H10Z" fill="#23303d" stroke="#0d1117" strokeWidth="2.5" />
          <rect x="52" y="76" width="16" height="28" rx="7" fill="#0d1117" />
          {/* 魔王 */}
          <g>
            <path d="M60 10c16 0 27 11 27 25 0 13-9 21-27 21s-27-8-27-21c0-14 11-25 27-25Z" fill={mood} stroke="#0d1117" strokeWidth="2.5" />
            <path d="M33 26 24 10l14 7ZM87 26l9-16-14 7Z" fill={mood} stroke="#0d1117" strokeWidth="2.5" strokeLinejoin="round" />
            {dead ? (
              <>
                <path d="M46 32l9 9M55 32l-9 9M65 32l9 9M74 32l-9 9" stroke="#0d1117" strokeWidth="3.4" strokeLinecap="round" />
                <path d="M50 46q10 7 20 0" stroke="#0d1117" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="50" cy="35" rx="5" ry={pct < 30 ? 3 : 5.5} fill="#0d1117" />
                <ellipse cx="70" cy="35" rx="5" ry={pct < 30 ? 3 : 5.5} fill="#0d1117" />
                <path d={pct < 45 ? "M49 50q11 -7 22 0" : "M49 47q11 6 22 0"} stroke="#0d1117" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>
          {/* 血量越低裂痕越多 */}
          {pct < 60 && <path d="M38 62l6 14-5 10" stroke="#0d1117" strokeWidth="2" fill="none" />}
          {pct < 30 && <path d="M82 60l-7 16 6 12M24 66l5 12" stroke="#0d1117" strokeWidth="2" fill="none" />}
        </svg>
        <Floaters bumps={bumps} lane={0} />
      </div>

      <div className="w-[70%]">
        <div className="mb-[0.6vh] flex items-end justify-between">
          <span className="text-[2.1vw] leading-none font-black">{lane.name}</span>
          <span className="num text-[1.6vw] text-[#9ba6b4]">{dead ? "已擊倒" : `剩 ${hp.toLocaleString()} / ${goal.toLocaleString()}`}</span>
        </div>
        <div className="h-[3.4vh] overflow-hidden rounded-full border-2 border-[#0d1117] bg-[#23303d]">
          <div className="h-full rounded-r-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: mood }} />
        </div>
        <div className="mt-[0.8vh] text-center text-[1.4vw] text-[#9ba6b4]">{lane.players} 人正在攻城{!safe && lane.score > 0 && `　已造成 ${lane.score.toLocaleString()} 傷害`}</div>
      </div>

      {dead && reward && (
        <div className="animate-pop rounded-[22px] bg-[#4ade80] px-[3vw] py-[1.6vh] text-center text-[#07210f]">
          <div className="text-[1.4vw] font-bold">城破了，解鎖</div>
          <div className="text-[3.2vw] leading-tight font-black">{reward}</div>
        </div>
      )}
    </div>
  );
}
