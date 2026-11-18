"use client";

import { IconScreen, IconTroops, IconWheel } from "@/components/icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFan, type FanInfo } from "@/components/useFan";
import { submitForm } from "@/lib/liff-client";
import { newKey, postJson } from "@/lib/net";
import type { PublicGame } from "@/lib/games";
import { LANE_COLORS, remain } from "@/components/gameui";
import { Wheel } from "@/components/games/Wheel";

export function GameApp(props: { slug: string; name: string; initial: PublicGame | null; payMode: "auto" | "manual" | null; fan: FanInfo; liffId: string; devLogin: boolean }) {
  const { ensureFan } = useFan(props.fan, props.liffId, props.devLogin);
  const [g, setG] = useState(props.initial);
  const [lane, setLane] = useState<number | null>(props.initial?.lockedLane ?? props.initial?.me?.lane ?? (props.initial && props.initial.lanes.length === 1 ? 0 : null));
  const [now, setNow] = useState(0);
  const [cool, setCool] = useState(0);
  const [msg, setMsg] = useState("");
  const [pops, setPops] = useState<{ id: number; n: number; x: number }[]>([]);
  const taps = useRef(0);
  const api = `/api/p/${props.slug}/game`;

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(async () => {
      setNow(Date.now());
      const n = taps.current;
      taps.current = 0;
      const r = n && lane != null ? await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lane, count: n }) }) : await fetch(api);
      if (r.ok) setG((await r.json()).game);
    }, 1000);
    return () => clearInterval(t);
  }, [api, lane]);

  if (!g) return <Shell><p className="h2">目前沒有進行中的遊戲</p><p className="mt-2 text-[#B9B5AC]">{props.name} 開始遊戲時，這裡會自動出現。</p><Link href={`/p/${props.slug}/hub`} className="btn btn-secondary mt-6">回到現場互動</Link></Shell>;

  const total = g.lanes.reduce((a, l) => a + l.score, 0) || 1;
  const running = g.status === "running";

  if (g.quiz) return <Shell><QuizView g={g} slug={props.slug} name={props.name} now={now} api={api} setG={setG} ensureFan={ensureFan} msg={msg} setMsg={setMsg} /></Shell>;
  if (g.wheel) return <Shell><WheelView g={g} name={props.name} api={api} setG={setG} ensureFan={ensureFan} msg={msg} setMsg={setMsg} /></Shell>;
  const myLane = g.lockedLane ?? lane ?? 0;
  const color = LANE_COLORS[myLane];
  const cooling = g.cooldown > 0 && now < cool;

  async function join(i: number) { if (await ensureFan()) setLane(i); else setMsg("請用 LINE 開啟這個頁面"); }
  function tap() {
    if (!running || cooling) return;
    taps.current += 1;
    if (g!.cooldown) setCool(Date.now() + g!.cooldown);
    // 回饋要立刻發生，不能等伺服器回來。先在畫面上加分，下一次輪詢會校正。
    const id = Date.now() + Math.random();
    setPops((p) => [...p.slice(-7), { id, n: g!.tapPower, x: 20 + Math.random() * 60 }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(g!.cooldown ? 24 : 8);
    setG((x) => x && { ...x, lanes: x.lanes.map((l, i) => (i === myLane ? { ...l, score: l.score + x.tapPower } : l)) });
  }
  async function buy(unit: { id: string; price: number; name: string }) {
    setMsg("");
    if (!props.payMode) return setMsg("表演者還沒設定收款方式");
    if (!(await ensureFan())) return setMsg("請用 LINE 開啟這個頁面");
    // 每次按下「派兵」是新的一筆，所以這裡產生新鑰匙；但這一筆在網路不穩時重送，
    // 用的是同一把，不會變成兩次扣款。
    const key = newKey();
    try {
      const j = await postJson<{ redirect?: string; action?: string; fields?: Record<string, string> }>(
        "/api/orders",
        { slug: props.slug, amount: unit.price, message: `${g!.name}・${unit.name}`, payMode: props.payMode, game: { id: g!.id, lane: myLane, unit: unit.id }, back: `/p/${props.slug}/game`, clientKey: key },
        { idempotent: true, timeout: 15_000, onRetry: () => setMsg("訊號不穩，重送中…") },
      );
      if (j.redirect) location.href = j.redirect; else submitForm(j.action!, j.fields!);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "失敗了");
    }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-[12px] text-[#B9B5AC]">{g.lockedLane == null ? `${props.name} 開的遊戲` : `你站在 ${g.lanes[g.lockedLane]?.name ?? props.name} 這邊`}</div><h1 className="h2">{g.name}</h1></div>
        <span className="num rounded-[12px] bg-[#232326] px-3 py-1.5 text-[17px] font-bold">{running ? remain(g.endsAt, now) : "結束"}</span>
      </div>
      {g.reward && <p className="mt-1 text-[14px] text-[#B9B5AC]">{g.lanes.length > 1 ? "贏的那邊：" : "達標就："}{g.reward}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {g.lanes.length === 2 ? (
          <>
            <div className="num flex justify-between text-[15px] font-bold"><span style={{ color: LANE_COLORS[0] }}>{g.lanes[0].name} {g.lanes[0].score.toLocaleString()}</span><span style={{ color: LANE_COLORS[1] }}>{g.lanes[1].score.toLocaleString()} {g.lanes[1].name}</span></div>
            <div className="h-3.5 overflow-hidden rounded-full" style={{ background: LANE_COLORS[1] }}><div className="h-full rounded-l-full" style={{ width: `${(g.type === "tug" ? 50 + ((g.lanes[0].score - g.lanes[1].score) / (g.goal || 1)) * 50 : (g.lanes[0].score / total) * 100)}%`, background: LANE_COLORS[0] }} /></div>
          </>
        ) : g.lanes.map((l, i) => (
          <div key={i}><div className="num flex justify-between text-[14px] font-bold"><span style={{ color: LANE_COLORS[i] }}>{l.name}</span><span>{l.score.toLocaleString()}{g.goal ? ` / ${g.goal.toLocaleString()}` : ""}</span></div><div className="h-3 overflow-hidden rounded-full bg-[#232326]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, g.goal ? (l.score / g.goal) * 100 : (l.score / total) * 100)}%`, background: LANE_COLORS[i] }} /></div></div>
        ))}
      </div>

      {!running ? (
        <div className="panel mt-6 p-5 text-center"><div className="text-[14px] text-[#B9B5AC]">結果</div><div className="h1 mt-1">{g.winner == null ? (g.lanes.length > 1 ? "平手" : "沒有達標") : g.lanes.length > 1 ? `${g.lanes[g.winner].name} 獲勝` : "達標了！"}</div>{g.winner != null && g.reward && <p className="mt-2">{g.reward}</p>}<Link href={`/p/${props.slug}/hub`} className="btn btn-secondary mt-5">回到現場互動</Link></div>
      ) : g.lockedLane == null && lane == null ? (
        <div className="mt-6 flex flex-col gap-3">
          <h2 className="h3">選一邊加入</h2>
          <p className="-mt-1 text-[13px] text-[#B9B5AC]">選好之後整場不能換邊，想清楚再按。</p>
          {g.lanes.map((l, i) => (
            <button
              key={i}
              onClick={() => join(i)}
              className="taptarget relative flex items-center gap-4 overflow-hidden rounded-[22px] border-2 p-5 text-left"
              style={{ borderColor: LANE_COLORS[i], background: `linear-gradient(100deg, ${LANE_COLORS[i]}26, #18181A 62%)` }}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[26px] font-black text-[#0E0E0F]" style={{ background: LANE_COLORS[i] }}>
                {l.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[22px] leading-tight" style={{ color: LANE_COLORS[i] }}>{l.name}</strong>
                <span className="text-[13px] text-[#B9B5AC]">{l.players} 人在這邊・戰力 {l.score.toLocaleString()}</span>
              </span>
              <span className="shrink-0 text-[13px] font-bold" style={{ color: LANE_COLORS[i] }}>加入 ›</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {g.me && <div className="grid grid-cols-3 gap-2 text-center">{[["我的貢獻", g.me.score.toLocaleString()], ["隊內排名", `#${g.me.rank}`], ["點按", String(g.me.taps)]].map(([l, v]) => <div key={l} className="panel !rounded-[14px] p-2.5"><div className="text-[11px] text-[#B9B5AC]">{l}</div><div className="num text-[19px] font-extrabold">{v}</div></div>)}</div>}
          {g.tapPower > 0 && (
            <div className="relative">
              <button
                onClick={tap}
                disabled={cooling}
                className="taptarget relative flex min-h-[140px] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-[26px] text-[#0E0E0F]"
                style={{ background: cooling ? "#232326" : color, boxShadow: `inset 0 3px 0 rgba(255,255,255,${cooling ? ".08" : ".4"}), 0 5px 0 rgba(0,0,0,.55)`, color: cooling ? "#F2EFE8" : "#0E0E0F" }}
              >
                {/* 冷卻時間用填滿的方式走完，比把按鈕變灰看得出來還要多久 */}
                {cooling && (
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 opacity-40"
                    style={{ width: `${Math.max(0, 100 - ((cool - now) / (g.cooldown || 1)) * 100)}%`, background: color, transition: "width .25s linear" }}
                  />
                )}
                <span className="text-[25px] leading-tight font-black">
                  {cooling ? "出發了" : g.type === "tug" ? "用力拉" : g.type === "race" ? "加速" : g.type === "siege" ? "攻擊" : "派兵"}
                </span>
                <span className="text-[13px] font-bold opacity-65">
                  {cooling ? `${Math.ceil((cool - now) / 1000)} 秒後可以再出手` : g.cooldown ? `每 ${g.cooldown / 1000} 秒一次・每次 +${g.tapPower}` : `一直點，每下 +${g.tapPower}`}
                </span>
                {/* 按下去的漣漪 */}
                {pops.map((p) => (
                  <span key={`r${p.id}`} className="taprings pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#0E0E0F]/35" />
                ))}
              </button>
              {/* 往上飄的 +N */}
              <div className="pointer-events-none absolute inset-0 overflow-visible">
                {pops.map((p) => (
                  <span key={p.id} className="num absolute bottom-10 animate-floatup text-[26px] leading-none font-black text-[#F2EFE8] drop-shadow-[0_2px_6px_rgba(0,0,0,.7)]" style={{ left: `${p.x}%` }}>
                    +{p.n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {g.units.length > 0 && <div className="mt-1 flex items-baseline justify-between"><strong>支持 {props.name}，加大力道</strong><span className="text-[12px] text-[#B9B5AC]">付款後立刻生效</span></div>}
          {g.units.map((u, i) => (
            <button key={u.id} onClick={() => buy(u)} className="taptarget flex items-center gap-3 rounded-[18px] border-2 border-[#2E2E32] bg-[#18181A] p-3.5 text-left">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[24px]" style={{ background: `${LANE_COLORS[i % LANE_COLORS.length]}22` }}>
                {[<IconTroops key="a" size={26} />, <IconWheel key="b" size={26} />, <IconScreen key="c" size={26} />][i] ?? <IconTroops size={26} />}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[17px]">{u.name}</strong>
                <span className="block text-[12px] text-[#B9B5AC]">{u.desc}</span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-[#232326]">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (u.power / 1000) * 100)}%`, background: color }} />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="num block text-[12px] font-bold" style={{ color }}>+{u.power}</span>
                <span className="num mt-1 block rounded-[12px] bg-[#F2EFE8] px-3 py-1.5 text-[14px] font-black text-[#0E0E0F]">NT${u.price}</span>
              </span>
            </button>
          ))}
          {g.type === "goal" && [100, 200, 500].map((a) => <button key={a} onClick={() => buy({ id: "goal", price: a, name: "集氣" })} className="btn btn-secondary">支持 NT${a}</button>)}
          {msg && <p className="text-[#FF8A80]">{msg}</p>}
          <p className="text-[12px] leading-5 text-[#8E8A81]">款項直接付給 {props.name}，平台不經手。遊戲只決定表演內容，沒有獎金或抽獎；付費加成在本局結束後不保留。</p>
        </div>
      )}
    </Shell>
  );
}

const Shell = ({ children }: { children: React.ReactNode }) => <div className="night min-h-dvh"><div className="mx-auto max-w-[480px] px-5 py-5">{children}</div></div>;

type ViewProps = { g: PublicGame; name: string; api: string; setG: (f: (x: PublicGame | null) => PublicGame | null) => void; ensureFan: () => Promise<boolean>; msg: string; setMsg: (s: string) => void };

/** 猜歌王／鐵粉測驗：完全免費，答對且越快分數越高 */
function QuizView({ g, now, api, setG, ensureFan, msg, setMsg, name }: ViewProps & { slug: string; now: number }) {
  const q = g.quiz!;
  const left = q.phase === "open" && now ? Math.max(0, q.secs - Math.floor((now - q.openedAt) / 1000)) : q.secs;
  const picked = q.mine?.picked ?? null;
  async function answer(i: number) {
    setMsg("");
    if (!(await ensureFan())) return setMsg("請用 LINE 開啟這個頁面");
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "answer", pick: i }) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error ?? "失敗了");
    setG(() => j.game);
  }
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-[12px] text-[#B9B5AC]">{name} 的題目</div><h1 className="h2">{g.name}</h1></div>
        <span className="num rounded-[12px] bg-[#232326] px-3 py-1.5 text-[17px] font-bold">{q.idx + 1} / {q.total}</span>
      </div>
      {q.question ? (
        <>
          <p className="mt-5 text-[22px] leading-8 font-bold">{q.question.q}</p>
          {q.phase === "open" && <p className="num mt-1 text-[#FFC83D]">剩 {left} 秒・{q.answered} 人作答</p>}
          {q.phase === "lobby" && <p className="mt-1 text-[#B9B5AC]">等 {name} 開放作答</p>}
          <div className="mt-4 flex flex-col gap-2">
            {q.question.options.map((o, i) => {
              const right = q.question!.answer === i;
              const mine = picked === i;
              const cls = q.phase === "reveal" ? (right ? "border-[#4ADE80] bg-[#15291C]" : mine ? "border-[#F06A7E]" : "border-[#2E2E32]") : mine ? "border-[#FFC83D]" : "border-[#2E2E32]";
              return (
                <button key={i} disabled={q.phase !== "open" || picked != null} onClick={() => answer(i)} className={`flex min-h-[56px] items-center gap-3 rounded-[16px] border-2 px-4 text-left text-[17px] ${cls}`}>
                  <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#232326] text-[13px] font-bold">{"ABCD"[i]}</span>
                  <span className="flex-1">{o}</span>
                  {q.phase === "reveal" && right && <span className="text-[13px] text-[#4ADE80]">正解</span>}
                </button>
              );
            })}
          </div>
          {q.phase === "reveal" && q.mine && <p className="mt-3 text-[#B9B5AC]">你目前 <span className="num font-bold text-[#F2EFE8]">{q.mine.score}</span> 分</p>}
        </>
      ) : (
        <p className="mt-6 text-[#B9B5AC]">題目準備中。</p>
      )}
      {q.board.length > 0 && (
        <div className="panel mt-6 p-4">
          <div className="mb-2 text-[13px] text-[#B9B5AC]">目前排行</div>
          {q.board.map((b, i) => (
            <div key={i} className="flex items-center gap-3 py-1 text-[16px]"><span className={`num w-6 text-center font-bold ${i ? "text-[#B9B5AC]" : "text-[#FFC83D]"}`}>{i + 1}</span><span className="flex-1 truncate">{b.name}{b.isMe ? "（我）" : ""}</span><span className="num">{b.score}</span></div>
          ))}
        </div>
      )}
      {msg && <p className="mt-3 text-[#FF8A80]">{msg}</p>}
      <p className="mt-4 text-[12px] leading-5 text-[#8E8A81]">完全免費，比的是誰答得快又準。沒有獎金，結果只決定表演內容。</p>
    </>
  );
}

/** 命運轉盤：觀眾免費投稿挑戰，表演者審核後轉盤決定 */
function WheelView({ g, name, api, setG, ensureFan, msg, setMsg }: ViewProps) {
  const w = g.wheel!;
  const [text, setText] = useState("");
  const ok = w.entries.filter((e) => e.status === "approved");
  const result = ok.find((e) => e.id === w.resultId);
  // 盤還在轉就先不要把答案寫出來
  const spinning = w.spunAt > 0 && Date.now() - w.spunAt < 7000;
  async function submit() {
    setMsg("");
    if (!text.trim()) return;
    if (!(await ensureFan())) return setMsg("請用 LINE 開啟這個頁面");
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "wish", text }) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error ?? "失敗了");
    setG(() => j.game);
    setText("");
  }
  return (
    <>
      <div><div className="text-[12px] text-[#B9B5AC]">{name} 的轉盤</div><h1 className="h2">{g.name}</h1></div>
      {g.reward && <p className="mt-1 text-[14px] text-[#B9B5AC]">{g.reward}</p>}
      <div className="mt-5 flex justify-center">
        <Wheel entries={ok} resultId={w.resultId} spunAt={w.spunAt} size={34} />
      </div>
      {result && !spinning && (
        <div className="mt-5 rounded-[20px] bg-[#FFB03A] p-5 text-[#0E0E0F]"><div className="text-[13px] font-bold">轉盤結果</div><div className="mt-1 text-[26px] leading-9 font-bold">{result.text}</div><div className="text-[14px]">{result.name} 投稿</div></div>
      )}
      <div className="mt-5 flex gap-2">
        <input value={text} maxLength={40} onChange={(e) => setText(e.target.value)} placeholder="寫一個挑戰，例：用台語唱副歌" className="input !bg-[#18181A] !text-[#F2EFE8]" style={{ borderColor: "#2E2E32" }} />
        <button onClick={submit} className="btn btn-now shrink-0">投稿</button>
      </div>
      <p className="mt-2 text-[12px] text-[#8E8A81]">免費參加，每人最多 2 個。{name} 審核後才會進轉盤；觀眾沒有獎品。</p>
      {msg && <p className="mt-2 text-[#FF8A80]">{msg}</p>}
      <div className="panel mt-5 p-4">
        <div className="mb-2 text-[13px] text-[#B9B5AC]">轉盤上的項目（{ok.length}）</div>
        {ok.length ? ok.map((e) => <div key={e.id} className="flex items-center gap-2 py-1 text-[16px]"><span className="flex-1">{e.text}</span><span className="text-[12px] text-[#8E8A81]">{e.name}</span></div>) : <p className="text-[#8E8A81]">還沒有通過審核的項目。</p>}
      </div>
      {w.entries.some((e) => e.mine && e.status === "pending") && <p className="mt-3 text-[13px] text-[#B9B5AC]">你的投稿在等審核。</p>}
    </>
  );
}
