"use client";

import type { PublicGame } from "@/lib/games";
import { remain } from "./gameui";
import { Clock, GameHead, LANE, TopThree } from "./games/bits";
import { Clash } from "./games/Clash";
import { Race } from "./games/Race";
import { Rope } from "./games/Rope";
import { Siege } from "./games/Siege";
import { Unlock } from "./games/Unlock";
import { Wheel } from "./games/Wheel";

/**
 * 大螢幕與 OBS 疊加的遊戲畫面。
 *
 * 每一款遊戲有自己的畫面，不共用長條圖：拔河有繩子、攻城有魔王、賽跑有跑道、
 * 轉盤真的會轉。遊戲的重點是懸念跟回饋，一條進度條兩樣都給不了。
 * safe=true 是給不想在直播上露出金額的人用的，只隱藏數字，不改玩法。
 */
export function GameView({ g, now, qr, safe }: { g: PublicGame; now: number; qr: string | null; safe?: boolean }) {
  const running = g.status === "running";
  const timer = <Clock label={running ? "剩餘" : "結束"} value={running ? remain(g.endsAt, now) : "0:00"} />;

  if (g.quiz) return <QuizScreen g={g} now={now} qr={qr} safe={safe} />;
  if (g.wheel) return <WheelScreen g={g} qr={qr} safe={safe} />;

  // 單隊的遊戲獎勵寫在畫面裡了，頁首不要再講一次
  const sub = g.lanes.length > 1 && g.reward ? `贏的那邊：${g.reward}` : `${g.lanes.reduce((n, l) => n + l.players, 0)} 人正在參與`;

  return (
    <div className="bc-scan flex h-full flex-col gap-[2vh] p-[3vw]">
      <GameHead title={g.name} sub={sub} timer={timer} qr={qr} safe={safe} />

      {!running && <Result g={g} />}

      {g.type === "tug" && <Rope lanes={g.lanes} goal={g.goal} safe={safe} />}
      {(g.type === "battle" || g.type === "pk") && <Clash lanes={g.lanes} pk={g.type === "pk"} safe={safe} />}
      {g.type === "race" && <Race lanes={g.lanes} goal={g.goal} safe={safe} />}
      {g.type === "siege" && <Siege lane={g.lanes[0]} goal={g.goal} reward={g.reward} safe={safe} />}
      {g.type === "goal" && <Unlock lane={g.lanes[0]} goal={g.goal} reward={g.reward} safe={safe} />}

      {g.lanes.length === 2 && (
        <div className="grid grid-cols-2 gap-[1.6vw]">
          {g.lanes.map((l, i) => <TopThree key={i} top={l.top} color={LANE[i]} safe={safe} />)}
        </div>
      )}
      {g.lanes.length === 1 && g.lanes[0].top.length > 0 && <TopThree top={g.lanes[0].top} color={LANE[0]} safe={safe} />}

      {!safe && g.feed.length > 0 && (
        <div className="flex gap-[2vw] overflow-hidden rounded-[16px] border border-[#2b3542] bg-[#151b24]/70 px-[1.4vw] py-[1vh] text-[1.6vw]">
          {g.feed.slice(0, 3).map((f) => (
            <span key={f.t} className="whitespace-nowrap"><span style={{ color: LANE[f.lane % LANE.length] }}>●</span> {f.text}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Result({ g }: { g: PublicGame }) {
  const multi = g.lanes.length > 1;
  return (
    <div className="animate-pop rounded-[22px] bg-[#ffb03a] px-[2vw] py-[1.6vh] text-center text-[#15110a]">
      <div className="text-[1.4vw] font-bold">結果</div>
      <div className="text-[4.2vw] leading-tight font-black">
        {g.winner == null ? (multi ? "平手" : "沒有達標") : multi ? `${g.lanes[g.winner].name} 獲勝` : "達標了"}
      </div>
      {g.winner != null && g.reward && <div className="text-[1.7vw] font-bold">{g.reward}</div>}
    </div>
  );
}

/** 問答：題目放到最大，倒數做成環，公布答案時顯示每個選項多少人選 */
function QuizScreen({ g, now, qr, safe }: { g: PublicGame; now: number; qr: string | null; safe?: boolean }) {
  const q = g.quiz!;
  const left = q.phase === "open" && now ? Math.max(0, q.secs - Math.floor((now - q.openedAt) / 1000)) : q.secs;
  const ring = q.phase === "open" ? (left / Math.max(1, q.secs)) * 100 : 100;

  return (
    <div className="bc-scan flex h-full flex-col gap-[2vh] p-[3vw]">
      <GameHead
        title={g.name}
        sub={`第 ${q.idx + 1} / ${q.total} 題${g.reward ? `・${g.reward}` : ""}`}
        qr={qr}
        safe={safe}
        timer={
          <div className="relative grid h-[9vw] w-[9vw] place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15.8" fill="none" stroke="#23303d" strokeWidth="3.4" />
              <circle cx="18" cy="18" r="15.8" fill="none" stroke={left <= 5 && q.phase === "open" ? "#ff4f1f" : "#ffb03a"} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={`${ring} 100`} pathLength={100} className="transition-[stroke-dasharray] duration-1000 ease-linear" />
            </svg>
            <div className="text-center">
              <div className="num text-[2.8vw] leading-none font-black">{q.phase === "open" ? left : q.answered}</div>
              <div className="text-[0.95vw] text-[#9ba6b4]">{q.phase === "open" ? "秒" : q.phase === "reveal" ? "人答過" : "準備"}</div>
            </div>
          </div>
        }
      />

      {q.question ? (
        <div className="flex flex-1 flex-col justify-center gap-[2.4vh]">
          <div className="text-[3.8vw] leading-[1.12] font-black tracking-[-0.03em]">{q.question.q}</div>
          <div className="grid grid-cols-2 gap-[1.4vw]">
            {q.question.options.map((o, i) => {
              const right = q.question!.answer === i;
              const revealed = q.phase === "reveal";
              return (
                <div
                  key={i}
                  className={`flex items-center gap-[1.2vw] rounded-[18px] border-2 p-[1.4vw] text-[2.3vw] transition-all duration-500 ${revealed && !right ? "opacity-35" : ""}`}
                  style={{ borderColor: revealed && right ? "#4ade80" : "#2b3542", background: revealed && right ? "#4ade8018" : "#151b24" }}
                >
                  <span className="num flex h-[3.2vw] w-[3.2vw] shrink-0 items-center justify-center rounded-[10px] text-[1.7vw] font-black" style={{ background: revealed && right ? "#4ade80" : "#23303d", color: revealed && right ? "#07210f" : "#f2efe9" }}>{"ABCD"[i]}</span>
                  <span className="min-w-0 flex-1">{o}</span>
                  {revealed && right && <span className="text-[1.5vw] font-bold text-[#4ade80]">正解</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-[2.4vw] text-[#6b7684]">題目準備中</div>
      )}

      {q.board.length > 0 && (
        <div className="flex gap-[2vw] rounded-[16px] border border-[#2b3542] bg-[#151b24]/70 px-[1.4vw] py-[1vh] text-[1.7vw]">
          {q.board.slice(0, 5).map((b, i) => (
            <span key={i} className="whitespace-nowrap"><span className={`num font-black ${i ? "text-[#9ba6b4]" : "text-[#ffb03a]"}`}>{i + 1}</span> {b.name} <span className="num text-[#9ba6b4]">{b.score}</span></span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 轉盤：左邊是真的會轉的盤，右邊是投稿清單與結果 */
function WheelScreen({ g, qr, safe }: { g: PublicGame; qr: string | null; safe?: boolean }) {
  const w = g.wheel!;
  const ok = w.entries.filter((e) => e.status === "approved");
  const result = ok.find((e) => e.id === w.resultId);
  const fresh = w.spunAt > 0 && Date.now() - w.spunAt < 7000;

  return (
    <div className="bc-scan flex h-full flex-col gap-[2vh] p-[3vw]">
      <GameHead title={g.name} sub={g.reward || "觀眾投稿挑戰，表演者審核過才會進轉盤"} qr={qr} safe={safe} />
      <div className="grid flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-[3.5vw] pt-[2vh]">
        <Wheel entries={ok} resultId={w.resultId} spunAt={w.spunAt} size={62} />
        <div className="flex flex-col gap-[2vh]">
          {result && !fresh ? (
            <div className="animate-pop rounded-[26px] bg-[#ffb03a] px-[2.4vw] py-[2.6vh] text-[#15110a]">
              <div className="text-[1.4vw] font-bold">轉到了</div>
              <div className="text-[3.8vw] leading-[1.08] font-black tracking-[-0.03em]">{result.text}</div>
              <div className="mt-[0.6vh] text-[1.5vw] font-bold opacity-65">{result.name} 投稿</div>
            </div>
          ) : (
            <>
              <div className="text-[2.1vw] leading-tight font-black">
                {ok.length ? <>盤上有 <span className="num text-[#ffb03a]">{ok.length}</span> 個挑戰</> : "等觀眾投稿"}
              </div>
              <div className="text-[1.4vw] text-[#9ba6b4]">
                {ok.length ? "表演者按下轉盤，轉到哪一個就做哪一個" : "掃右上角的碼，寫下你想看表演者做的事。表演者審核過才會上盤。"}
              </div>
              <div className="mt-[1vh] flex flex-wrap gap-[0.6vw]">
                {[...new Set(ok.map((e) => e.name))].slice(0, 8).map((nm) => (
                  <span key={nm} className="rounded-full border border-[#2b3542] px-[0.9vw] py-[0.4vh] text-[1.25vw] text-[#9ba6b4]">{nm}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
