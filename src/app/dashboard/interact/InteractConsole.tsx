"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicGame } from "@/lib/games";
import type { consoleState } from "@/lib/hub";
import { LANE_COLORS, remain } from "@/components/gameui";
import { PageHead } from "@/components/back/Shell";

type State = { hub: Awaited<ReturnType<typeof consoleState>>; game: PublicGame | null };
type GT = { id: string; name: string; desc: string; min: number; max: number; goal: number };
const HAND: Record<string, string> = { sing: "合唱", ask: "提問", wish: "祝福" };
const DEFAULT_LANES: Record<string, string> = { pk: "", battle: "藍隊\n紅隊", tug: "男生隊\n女生隊", race: "", siege: "魔王城", goal: "集氣", quiz: "猜歌王", wheel: "命運轉盤" };
/** 題目格式：一行一題「題目 / 選項1 / 選項2 / 選項3 *」，星號標在正解後面 */
function parseQuestions(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const parts = l.split(/\s*[\/｜|]\s*/).filter(Boolean);
    const q = parts.shift() ?? "";
    let answer = 0;
    const options = parts.map((o, i) => { if (/\*$/.test(o)) { answer = i; return o.replace(/\*$/, "").trim(); } return o; });
    return { q, options, answer };
  }).filter((x) => x.q && x.options.length >= 2);
}

export function InteractConsole({ slug, initial, types, liveNow }: { slug: string; initial: State; types: GT[]; liveNow: { slug: string; name: string }[] }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [now, setNow] = useState(0);
  const [prize, setPrize] = useState("免費點一首");
  const [gt, setGt] = useState<GT | null>(null);
  const [lanes, setLanes] = useState("");
  const [reward, setReward] = useState("");
  const [minutes, setMinutes] = useState(3);
  const [qtext, setQtext] = useState("");
  const [opponent, setOpponent] = useState("");
  const questions = parseQuestions(qtext);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(async () => { setNow(Date.now()); const r = await fetch("/api/dashboard/interact"); if (r.ok) setS(await r.json()); }, 2500);
    return () => clearInterval(t);
  }, []);
  async function act(body: Record<string, unknown>) {
    setMsg("");
    const r = await fetch("/api/dashboard/interact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error ?? "失敗了"); return false; }
    setS(j);
    if (j.winner) setMsg(`得主：${j.winner}（已用 LINE 通知）`);
    return true;
  }
  const { hub, game } = s;
  const lot = hub.lottery;
  const running = game?.status === "running";

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="互動與遊戲" desc={hub.live ? `演出中・${hub.present} 人簽到` : "開演後才能使用抽獎、舉手與遊戲。許願池隨時可以管理。"} actions={<Link href={`/live/${slug}/game`} target="_blank" className="btn btn-secondary btn-sm">開大螢幕</Link>} />
      {msg && <p className="rounded-[12px] bg-sunken px-3 py-2">{msg}</p>}

      <section className="sec flex flex-col gap-2">
        <div className="flex items-baseline justify-between"><h2 className="h3">應援能量</h2><span className="num font-semibold">{hub.hype}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className={`h-full rounded-full ${hub.hype >= 100 ? "bg-now" : "bg-ink"}`} style={{ width: `${hub.hype}%` }} /></div>
        {hub.hype >= 100 && <div className="flex flex-wrap items-center gap-3"><strong>集滿了，可以唱安可或開一場遊戲。</strong><button className="btn btn-quiet btn-sm" onClick={() => act({ action: "hype_reset" })}>歸零重新集</button></div>}
      </section>

      <section className="sec flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><h2 className="h3">免費抽獎</h2><span className="small">{lot ? (lot.status === "open" ? `進行中・${lot.entries} 人參加` : `已開獎：${lot.winner ?? "無人中獎"}`) : "未開始"}</span></div>
        {lot?.status === "open" ? (
          <div className="flex flex-wrap items-center gap-3"><span>獎品：{lot.prize}</span><button className="btn btn-primary btn-sm" onClick={() => act({ action: "lottery_draw" })}>現在開獎</button></div>
        ) : (
          <div className="flex flex-wrap items-end gap-3"><label className="field min-w-[200px] flex-1">獎品（由你提供）<input value={prize} maxLength={40} onChange={(e) => setPrize(e.target.value)} /></label><button disabled={!hub.live} className="btn btn-secondary" onClick={() => act({ action: "lottery_start", prize, minutes: 3 })}>開始抽獎</button></div>
        )}
        <p className="small text-ink3">觀眾當場簽到就能免費參加。</p>
      </section>

      <section className="sec">
        <div className="flex items-baseline justify-between"><h2 className="h3">舉手名單</h2><span className="small">{hub.hands.filter((h) => h.status === "waiting").length} 人等待</span></div>
        {hub.hands.length ? hub.hands.map((h) => (
          <div key={h.id} className="row flex items-center gap-3 py-3"><span className="tag">{HAND[h.kind]}</span><span className="min-w-0 flex-1"><strong>{h.name || "觀眾"}</strong>{h.text && <span className="small block">{h.text}</span>}</span>{h.status === "waiting" ? <button className="btn btn-secondary btn-sm" onClick={() => act({ action: "pick", id: h.id })}>點他</button> : <span className="small text-ok">已通知</span>}</div>
        )) : <p className="small py-3">還沒有人舉手。</p>}
      </section>

      <section className="sec flex flex-col gap-3">
        <div className="flex items-baseline justify-between"><h2 className="h3">互動遊戲</h2>{game && <span className="small">{game.name}・{running ? `剩 ${remain(game.endsAt, now)}` : "已結束"}</span>}</div>
        {running && game?.quiz ? (
          <div className="card flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-baseline gap-2"><strong>第 {game.quiz.idx + 1} / {game.quiz.total} 題</strong><span className="small">{game.quiz.phase === "open" ? `作答中・${game.quiz.answered} 人已答` : game.quiz.phase === "reveal" ? "已公布答案" : "還沒開放作答"}</span></div>
            {game.quiz.question && <p className="text-[17px] font-bold">{game.quiz.question.q}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-now btn-sm" onClick={() => act({ action: "quiz", mode: "open", secs: 15 })}>開放作答（15 秒）</button>
              <button className="btn btn-primary btn-sm" onClick={() => act({ action: "quiz", mode: "reveal" })}>公布答案</button>
              <button className="btn btn-secondary btn-sm" onClick={() => act({ action: "quiz", mode: "next" })}>下一題</button>
              <button className="btn btn-quiet btn-sm" onClick={() => act({ action: "game_end" })}>結束</button>
            </div>
            {game.quiz.board.length > 0 && <p className="small">排行：{game.quiz.board.slice(0, 3).map((b, i) => `${i + 1}. ${b.name} ${b.score}`).join("・")}</p>}
          </div>
        ) : running && game?.wheel ? (
          <div className="card flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-baseline gap-2"><strong>命運轉盤</strong><span className="small">{game.wheel.entries.filter((e) => e.status === "approved").length} 個已通過・{game.wheel.entries.filter((e) => e.status === "pending").length} 個待審核</span></div>
            {game.wheel.entries.filter((e) => e.status === "pending").map((e) => (
              <div key={e.id} className="row flex items-center gap-3 py-2"><span className="min-w-0 flex-1"><strong>{e.text}</strong><span className="small block">{e.name} 投稿</span></span><button className="btn btn-secondary btn-sm" onClick={() => act({ action: "wheel_review", id: e.id, approve: true })}>通過</button><button className="btn btn-quiet btn-sm" onClick={() => act({ action: "wheel_review", id: e.id, approve: false })}>略過</button></div>
            ))}
            {game.wheel.resultId && <p className="rounded-[12px] bg-sunken px-3 py-2">轉到：{game.wheel.entries.find((e) => e.id === game.wheel!.resultId)?.text}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-now btn-sm" onClick={() => act({ action: "wheel_spin" })}>轉一次</button>
              <button className="btn btn-quiet btn-sm" onClick={() => act({ action: "game_end" })}>結束</button>
            </div>
            <p className="small text-ink3">完全免費，觀眾沒有獎品；轉到什麼就做什麼表演內容。</p>
          </div>
        ) : running && game ? (
          <div className="card flex flex-col gap-3 p-4">
            {game.lanes.map((l, i) => <div key={i} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: LANE_COLORS[i] }} /><strong>{l.name}</strong><span className="small">{l.players} 人</span></span><span className="num text-[20px] font-bold">{l.score.toLocaleString()}{game.goal ? <span className="small font-normal"> / {game.goal.toLocaleString()}</span> : null}</span></div>)}
            {game.feed[0] && <p className="small">剛剛：{game.feed[0].text}</p>}
            <button className="btn btn-secondary btn-sm self-start" onClick={() => act({ action: "game_end" })}>提前結束並公布</button>
          </div>
        ) : (
          <>
            {game && game.status === "ended" && <p className="rounded-[12px] bg-sunken px-3 py-2">上一局「{game.name}」：{game.winner == null ? (game.lanes.length > 1 ? "平手" : "沒有達標") : game.lanes.length > 1 ? `${game.lanes[game.winner].name} 獲勝` : "達標"}{game.reward ? `（${game.reward}）` : ""}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {types.map((t) => <button key={t.id} onClick={() => { setGt(t); setLanes(DEFAULT_LANES[t.id] ?? ""); setReward(""); }} aria-pressed={gt?.id === t.id} className={`card flex flex-col items-start gap-1 p-4 text-left ${gt?.id === t.id ? "shadow-[0_2px_0_#151412]" : "!border-rule"}`}><strong className="h3">{t.name}</strong><span className="small">{t.desc}</span></button>)}
            </div>
            {gt && (
              <div className="card flex flex-col gap-3 p-4">
                {gt.id !== "pk" && <label className="field">{gt.max === 1 ? "名稱" : gt.id === "race" ? "參賽歌曲（一行一首，2–4 首）" : "隊伍名稱（一行一隊）"}<textarea value={lanes} onChange={(e) => setLanes(e.target.value)} style={{ minHeight: gt.max === 1 ? 48 : 96 }} /></label>}
                {gt.id === "pk" && (
                  <label className="field">對手（現在正在演出的表演者）
                    <select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
                      <option value="">請選擇</option>
                      {liveNow.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                    </select>
                    <span className="small">{liveNow.length ? "對方會收到 LINE 通知，兩邊的粉絲各自幫自己人加分。" : "目前沒有其他表演者在演出。"}</span>
                  </label>
                )}
                {gt.id === "quiz" && (
                  <label className="field">題目（一行一題：題目 / 選項1 / 選項2 / 選項3，正解後面加 *）
                    <textarea value={qtext} rows={5} onChange={(e) => setQtext(e.target.value)} placeholder={"這首前奏是哪一首？ / 晴天* / 稻香 / 說好不哭\n我最常唱的台語歌？ / 家後* / 浪子回頭"} />
                    <span className="small">{questions.length ? `讀到 ${questions.length} 題` : "還沒有可用的題目"}</span>
                  </label>
                )}
                <label className="field">{gt.max === 1 ? "達標就解鎖" : "贏的那邊得到"}<input value={reward} maxLength={60} onChange={(e) => setReward(e.target.value)} placeholder={gt.max === 1 ? "例：用台語唱〈晴天〉" : "例：決定安可曲"} /></label>
                <div className="flex flex-wrap items-center gap-2"><span className="label mr-1">時間</span>{[1, 3, 5, 10].map((m) => <button key={m} onClick={() => setMinutes(m)} className={`btn btn-sm ${minutes === m ? "btn-primary" : "btn-secondary"}`}>{m} 分</button>)}</div>
                <button disabled={!hub.live || (gt.id === "quiz" && !questions.length) || (gt.id === "pk" && !opponent)} className="btn btn-now self-start" onClick={async () => { if (await act({ action: "game_start", type: gt.id, lanes: lanes.split("\n"), reward, minutes, questions: gt.id === "quiz" ? questions : undefined, opponentSlug: gt.id === "pk" ? opponent : undefined })) { setGt(null); setQtext(""); setOpponent(""); } }}>開始（觀眾手機與大螢幕同步）</button>
                <p className="small text-ink3">{gt.id === "quiz" || gt.id === "wheel" ? "這款完全免費，觀眾沒有獎品，結果只決定表演內容。" : "免費點按就能玩；付費加成是直接給你的支持，一樣扣 3% 點數。結果只決定表演內容，請不要發放獎金。"}</p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="sec">
        <h2 className="h3">許願池</h2>
        {hub.wishes.length ? hub.wishes.map((w) => (
          <div key={w.id} className="row flex flex-wrap items-center gap-3 py-3"><span className="min-w-0 flex-1"><strong>{w.title}</strong><span className="small block"><span className="num">{w.votes}</span> 人想聽・{w.status === "open" ? "許願中" : w.status === "practice" ? "練習中" : "已學會"}</span></span>
            {w.status === "open" && <button className="btn btn-secondary btn-sm" onClick={() => act({ action: "wish", id: w.id, status: "practice" })}>我要練這首</button>}
            {w.status === "practice" && <button className="btn btn-primary btn-sm" onClick={() => act({ action: "wish", id: w.id, status: "done" })}>學會了，通知許願的人</button>}
          </div>
        )) : <p className="small py-3">還沒有願望。觀眾可以在現場互動頁許願。</p>}
      </section>
    </div>
  );
}
