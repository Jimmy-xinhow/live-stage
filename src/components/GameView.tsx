"use client";

import type { PublicGame } from "@/lib/games";
import { LANE_COLORS, remain } from "./gameui";

/** 大螢幕與 OBS 疊加共用的遊戲畫面（夜場主題） */
export function GameView({ g, now, qr, safe }: { g: PublicGame; now: number; qr: string | null; safe?: boolean }) {
  if (g.quiz) return <QuizScreen g={g} now={now} qr={qr} safe={safe} />;
  if (g.wheel) return <WheelScreen g={g} qr={qr} safe={safe} />;
  const total = g.lanes.reduce((a, l) => a + l.score, 0) || 1;
  const two = g.lanes.length === 2;
  const running = g.status === "running";
  const pct = two ? (g.type === "tug" ? 50 + ((g.lanes[0].score - g.lanes[1].score) / (g.goal || 1)) * 50 : (g.lanes[0].score / total) * 100) : 0;
  return (
    <div className="flex h-full flex-col gap-[2.2vh] p-[3.3vw]">
      <div className="flex items-center gap-[2vw]">
        <div className="flex-1"><div className="text-[1.5vw] text-[#B9B5AC]">{g.reward ? (g.lanes.length > 1 ? `贏的那邊：${g.reward}` : `達標就：${g.reward}`) : "互動遊戲"}</div><div className="text-[3.6vw] leading-tight font-bold">{g.name}</div></div>
        <div className="panel px-[2vw] py-[1vh] text-center"><div className="text-[1.1vw] text-[#B9B5AC]">{running ? "剩餘" : "結束"}</div><div className="num text-[3.4vw] leading-none font-extrabold">{running ? remain(g.endsAt, now) : "0:00"}</div></div>
        {qr && !safe && <div className="flex items-center gap-[1vw] rounded-[20px] bg-white p-[0.8vw] text-[#0E0E0F]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={qr} alt="掃碼加入" className="h-[7vw] w-[7vw]" /><strong className="pr-[0.6vw] text-[1.5vw] leading-tight">掃碼<br />加入</strong></div>}
      </div>

      {!running && (
        <div className="rounded-[24px] bg-[#FF6A3D] px-[2vw] py-[2vh] text-center text-[#0E0E0F]"><div className="text-[1.5vw] font-bold">結果</div><div className="text-[4.5vw] leading-tight font-bold">{g.winner == null ? (g.lanes.length > 1 ? "平手" : "沒有達標") : g.lanes.length > 1 ? `${g.lanes[g.winner].name} 獲勝` : "達標了！"}</div>{g.winner != null && g.reward && <div className="text-[1.8vw]">{g.reward}</div>}</div>
      )}

      {two ? (
        <div className="flex flex-1 flex-col justify-center gap-[2.5vh]">
          <div className="grid grid-cols-2 gap-[2vw]">
            {g.lanes.map((l, i) => (
              <div key={i} className={`panel flex items-center justify-between p-[1.6vw] ${i ? "flex-row-reverse text-right" : ""}`} style={{ borderColor: LANE_COLORS[i], borderWidth: 2 }}>
                <div><div className="text-[1.3vw] text-[#B9B5AC]">{l.players} 人</div><div className="text-[3vw] leading-tight font-bold">{l.name}</div></div>
                <div className="num text-[4.4vw] leading-none font-extrabold" style={{ color: LANE_COLORS[i] }}>{l.score.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="relative h-[3.2vh] rounded-full" style={{ background: LANE_COLORS[1] }}>
            <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${Math.max(2, Math.min(98, pct))}%`, background: LANE_COLORS[0] }} />
            <div className="absolute top-1/2 h-[5vh] w-[5vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.4vh] border-[#0E0E0F] bg-[#FFC83D] transition-all duration-700" style={{ left: `${Math.max(2, Math.min(98, pct))}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-[2vw]">
            {g.lanes.map((l, i) => (
              <div key={i} className="panel p-[1.4vw]"><div className="mb-[0.6vh] text-[1.2vw] tracking-widest" style={{ color: LANE_COLORS[i] }}>{l.name}・貢獻前三</div>{l.top.length ? l.top.map((t, k) => <div key={k} className="flex items-center gap-[1vw] py-[0.3vh] text-[1.7vw]"><span className={`num flex h-[2.2vw] w-[2.2vw] items-center justify-center rounded-[8px] text-[1.2vw] font-extrabold ${k ? "bg-[#232326]" : "bg-[#FFC83D] text-[#0E0E0F]"}`}>{k + 1}</span><strong className="flex-1">{t.name}</strong>{!safe && <span className="num text-[#B9B5AC]">{t.score.toLocaleString()}</span>}</div>) : <div className="text-[1.4vw] text-[#8E8A81]">等你加入</div>}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel flex flex-1 flex-col justify-center gap-[2.4vh] p-[2vw]">
          {g.lanes.map((l, i) => {
            const w = Math.min(100, g.goal ? (l.score / g.goal) * 100 : (l.score / total) * 100);
            return (
              <div key={i} className="grid grid-cols-[18vw_minmax(0,1fr)_9vw] items-center gap-[1.5vw]">
                <div><div className="text-[2.2vw] leading-tight font-bold">{l.name}</div><div className="text-[1.2vw] text-[#B9B5AC]">{l.players} 人在推</div></div>
                <div className="relative h-[3vh] rounded-full bg-[#232326]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, background: LANE_COLORS[i], opacity: 0.45 }} /><div className="absolute top-1/2 h-[5.5vh] w-[5.5vh] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.4vh] border-[#0E0E0F] transition-all duration-700" style={{ left: `${Math.max(2, w)}%`, background: LANE_COLORS[i] }} /></div>
                <div className="num text-right text-[2vw] font-extrabold">{l.score.toLocaleString()}{g.goal ? <span className="block text-[1.1vw] font-semibold text-[#8E8A81]">/ {g.goal.toLocaleString()}</span> : null}</div>
              </div>
            );
          })}
        </div>
      )}

      {!safe && g.feed.length > 0 && <div className="panel flex gap-[2vw] overflow-hidden px-[1.6vw] py-[1.2vh] text-[1.6vw]">{g.feed.slice(0, 3).map((f) => <span key={f.t} className="whitespace-nowrap"><span className="font-bold" style={{ color: LANE_COLORS[f.lane] }}>●</span> {f.text}</span>)}</div>}
    </div>
  );
}

const Head = ({ title, sub, right, qr, safe }: { title: string; sub: string; right?: React.ReactNode; qr: string | null; safe?: boolean }) => (
  <div className="flex items-center gap-[2vw]">
    <div className="flex-1"><div className="text-[1.5vw] text-[#B9B5AC]">{sub}</div><div className="text-[3.6vw] leading-tight font-bold">{title}</div></div>
    {right}
    {qr && !safe && <div className="flex items-center gap-[1vw] rounded-[20px] bg-white p-[0.8vw] text-[#0E0E0F]">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={qr} alt="掃碼加入" className="h-[7vw] w-[7vw]" /><strong className="pr-[0.6vw] text-[1.5vw] leading-tight">掃碼<br />加入</strong></div>}
  </div>
);

/** 問答大螢幕：題目與選項放大，答案公布前不顯示正解 */
function QuizScreen({ g, now, qr, safe }: { g: PublicGame; now: number; qr: string | null; safe?: boolean }) {
  const q = g.quiz!;
  const left = q.phase === "open" && now ? Math.max(0, q.secs - Math.floor((now - q.openedAt) / 1000)) : q.secs;
  return (
    <div className="flex h-full flex-col gap-[2.2vh] p-[3.3vw]">
      <Head
        title={g.name}
        sub={`第 ${q.idx + 1} / ${q.total} 題${g.reward ? `・${g.reward}` : ""}`}
        qr={qr}
        safe={safe}
        right={<div className="panel px-[2vw] py-[1vh] text-center"><div className="text-[1.1vw] text-[#B9B5AC]">{q.phase === "open" ? "作答中" : q.phase === "reveal" ? "公布答案" : "準備"}</div><div className="num text-[3.4vw] leading-none font-extrabold">{q.phase === "open" ? left : q.answered}</div></div>}
      />
      {q.question ? (
        <div className="flex flex-1 flex-col justify-center gap-[2.5vh]">
          <div className="text-[4vw] leading-tight font-bold">{q.question.q}</div>
          <div className="grid grid-cols-2 gap-[1.6vw]">
            {q.question.options.map((o, i) => {
              const right = q.question!.answer === i;
              return (
                <div key={i} className="panel flex items-center gap-[1.4vw] p-[1.6vw] text-[2.4vw]" style={right ? { borderColor: "#4ADE80", borderWidth: 2 } : undefined}>
                  <span className="num flex h-[3.4vw] w-[3.4vw] items-center justify-center rounded-[10px] bg-[#232326] text-[1.8vw] font-extrabold">{"ABCD"[i]}</span>
                  <span className="flex-1">{o}</span>
                  {right && <span className="text-[1.6vw] text-[#4ADE80]">正解</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-[2.6vw] text-[#8E8A81]">題目準備中</div>
      )}
      {q.board.length > 0 && (
        <div className="panel flex gap-[2.4vw] px-[1.6vw] py-[1.2vh] text-[1.7vw]">
          {q.board.slice(0, 5).map((b, i) => <span key={i} className="whitespace-nowrap"><span className={`num font-extrabold ${i ? "text-[#B9B5AC]" : "text-[#FFC83D]"}`}>{i + 1}</span> {b.name} <span className="num text-[#B9B5AC]">{b.score}</span></span>)}
        </div>
      )}
    </div>
  );
}

/** 轉盤大螢幕：顯示所有通過審核的項目與轉到的結果 */
function WheelScreen({ g, qr, safe }: { g: PublicGame; qr: string | null; safe?: boolean }) {
  const w = g.wheel!;
  const ok = w.entries.filter((e) => e.status === "approved");
  const result = ok.find((e) => e.id === w.resultId);
  return (
    <div className="flex h-full flex-col gap-[2.2vh] p-[3.3vw]">
      <Head title={g.name} sub={g.reward || "觀眾投稿，表演者審核，完全免費"} qr={qr} safe={safe} />
      {result ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[2vh]">
          <div className="text-[1.8vw] text-[#B9B5AC]">轉盤結果</div>
          <div className="animate-pop rounded-[24px] bg-[#FF6A3D] px-[4vw] py-[3vh] text-center text-[#0E0E0F]"><div className="text-[5vw] leading-tight font-bold">{result.text}</div><div className="text-[1.8vw]">{result.name} 投稿</div></div>
        </div>
      ) : (
        <div className="panel flex flex-1 flex-wrap content-center items-center justify-center gap-[1.4vw] p-[2vw]">
          {ok.length ? ok.slice(0, 12).map((e) => <span key={e.id} className="rounded-[16px] bg-[#232326] px-[1.6vw] py-[1vh] text-[2vw]">{e.text}</span>) : <span className="text-[2.4vw] text-[#8E8A81]">等觀眾投稿</span>}
        </div>
      )}
    </div>
  );
}
