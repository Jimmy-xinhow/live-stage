"use client";

import { bossArt } from "@/lib/gameart";
import { Floaters, useBumps } from "./bits";
import { Roll } from "./Roll";

/**
 * 攻城魔王戰：全場一起打一個目標。
 *
 * 原本畫了一個卡通魔王——圓臉、兩個點、一道弧線當嘴巴。那是兒童塗鴉的造型語彙，
 * 放在表演者的大螢幕上會毀掉整場的質感。真正的轉播記分板不畫怪物，
 * 它用材質、光、和巨大的數字。
 *
 * 所以這裡改成一個能量核心：外環是血量、內核隨血量變色與失穩、受擊時整個抖＋光爆。
 * 之後有美術資產（bossArt）就會自動換成立繪，核心退成底座的光環。
 */
export function Siege({
  lane, goal, reward, safe,
}: {
  lane: { name: string; score: number; players: number };
  goal: number; reward: string; safe?: boolean;
}) {
  const hp = Math.max(0, goal - lane.score);
  const pct = goal ? (hp / goal) * 100 : 100;
  const dead = hp <= 0;
  const bumps = useBumps([lane.score]);
  const hurt = bumps.length > 0;
  const mood = dead ? "#4ade80" : pct < 25 ? "#ff4f1f" : pct < 60 ? "#ffb03a" : "#e8356d";
  const img = bossArt(pct);

  // 血量越低轉得越快，看得出來快打完了
  const spin = dead ? 0 : 26 - (100 - pct) * 0.19;
  const R = 86, C = 2 * Math.PI * R;

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center gap-[3.4vw] pb-[1vh]">
      {/* 核心 */}
      <div className={`relative shrink-0 ${hurt ? "animate-shake" : ""}`} style={{ width: "36vh", height: "36vh" }}>
        <svg viewBox="-110 -110 220 220" className="h-full w-full">
          <defs>
            <radialGradient id="core">
              <stop offset="0%" stopColor="#fff" stopOpacity={dead ? ".25" : ".92"} />
              <stop offset="45%" stopColor={mood} stopOpacity=".85" />
              <stop offset="100%" stopColor={mood} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ring" x1="0" y1="-1" x2="0" y2="1">
              <stop offset="0%" stopColor={mood} />
              <stop offset="100%" stopColor={mood} stopOpacity=".45" />
            </linearGradient>
          </defs>

          {/* 外圈刻度：像儀表，不是裝飾 */}
          <g opacity=".3">
            {Array.from({ length: 60 }).map((_, i) => (
              <line key={i} x1="0" y1="-103" x2="0" y2={i % 5 === 0 ? -95 : -99}
                stroke="#f2efe9" strokeWidth={i % 5 === 0 ? 2 : 1}
                transform={`rotate(${i * 6})`} />
            ))}
          </g>

          {/* 血量環 */}
          <circle r={R} fill="none" stroke="#1b2430" strokeWidth="13" />
          <circle
            r={R} fill="none" stroke="url(#ring)" strokeWidth="13" strokeLinecap="round"
            strokeDasharray={`${(C * pct) / 100} ${C}`}
            transform="rotate(-90)"
            style={{ transition: "stroke-dasharray .75s cubic-bezier(.22,1,.32,1)", filter: `drop-shadow(0 0 14px ${mood})` }}
          />

          {/* 核心本體：有美術就讓位，沒有就用能量球 */}
          {img ? null : (
            <>
              <circle r="62" fill="url(#core)" className={dead ? "" : "animate-slowpulse"} />
              <g style={{ transformOrigin: "center", animation: spin > 0 ? `spin ${spin}s linear infinite` : "none" }}>
                <circle r="48" fill="none" stroke={mood} strokeWidth="2" strokeDasharray="8 14" opacity=".8" />
                <circle r="34" fill="none" stroke="#f2efe9" strokeWidth="1.5" strokeDasharray="3 22" opacity=".55" />
              </g>
              {/* 血量低時核心失穩，裂出碎片 */}
              {pct < 45 && !dead && (
                <g opacity=".85">
                  {[18, 74, 143, 211, 298].map((a) => (
                    <path key={a} d="M0 -52 L5 -38 L-5 -38 Z" fill={mood} transform={`rotate(${a}) translate(0 ${pct < 25 ? -26 : -18})`} />
                  ))}
                </g>
              )}
            </>
          )}
        </svg>

        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className={`absolute inset-[18%] h-[64%] w-[64%] object-contain ${hurt ? "animate-hit" : ""}`} />
        )}

        {/* 中央狀態 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="bc-num text-[6.2vh] leading-none" style={{ "--numc": mood } as React.CSSProperties}>
            {dead ? "0" : <Roll value={hp} />}
          </div>
          <div className="mt-[0.4vh] text-[1.5vh] tracking-[.18em] text-[#9ba6b4]">{dead ? "已擊倒" : "剩餘"}</div>
        </div>

        <Floaters bumps={bumps} lane={0} />
      </div>

      {/* 側欄 */}
      <div className="flex min-w-0 flex-1 flex-col gap-[2.2vh]">
        <div>
          <div className="text-[1.5vw] text-[#9ba6b4]">正在攻打</div>
          <div className="truncate text-[3.4vw] leading-tight font-black">{lane.name}</div>
        </div>

        <div className="bc bc-edge rounded-[20px] p-[1.6vw]" style={{ "--edge": mood } as React.CSSProperties}>
          <div className="mb-[0.8vh] flex items-baseline justify-between">
            <span className="text-[1.2vw] tracking-[.1em] text-[#9ba6b4]">剩餘血量</span>
            <span className="num text-[1.5vw] font-bold" style={{ color: mood }}>{Math.round(pct)}%</span>
          </div>
          <div className="bc-bar h-[2.6vh]">
            <div className="bc-fill" style={{ width: `${pct}%`, "--fc": mood } as React.CSSProperties} />
          </div>
          <div className="mt-[1vh] flex justify-between text-[1.25vw] text-[#9ba6b4]">
            <span>{lane.players} 人正在攻城</span>
            {!safe && lane.score > 0 && <span>已造成 <span className="num">{lane.score.toLocaleString()}</span> 傷害</span>}
          </div>
        </div>

        {reward && (
          <div className="flex items-baseline gap-[1vw]">
            <span className="shrink-0 text-[1.2vw] font-bold" style={{ color: dead ? "#4ade80" : "#9ba6b4" }}>{dead ? "城破了，解鎖" : "打倒就"}</span>
            <span className={`min-w-0 flex-1 truncate text-[2.3vw] leading-tight font-black ${dead ? "animate-pop" : ""}`} style={{ color: dead ? "#4ade80" : undefined }}>{reward}</span>
          </div>
        )}
      </div>
    </div>
  );
}
