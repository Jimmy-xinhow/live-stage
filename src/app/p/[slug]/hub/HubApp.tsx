"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFan, type FanInfo } from "@/components/useFan";
import type { HubState } from "@/lib/hub";
import { initial as initialOf } from "@/lib/format";

const HANDS = [["sing", "想上台合唱"], ["ask", "想問問題"], ["wish", "告白・祝福"]] as const;

export function HubApp(props: { slug: string; name: string; avatar: string | null; initial: HubState; nowPlaying: { title: string; by: string } | null; nextTitle: string | null; waiting: number; gameOn: string | null; fan: FanInfo;}) {
  const { ensureFan } = useFan(props.fan);
  const [s, setS] = useState(props.initial);
  const [msg, setMsg] = useState("");
  const [sheet, setSheet] = useState<null | "hand" | "wish">(null);
  const [hand, setHand] = useState({ kind: "sing", text: "" });
  const [wish, setWish] = useState("");
  const [mine, setMine] = useState(0);
  const pending = useRef(0);
  const api = `/api/p/${props.slug}/hub`;

  useEffect(() => {
    const t = setInterval(async () => {
      const n = pending.current;
      pending.current = 0;
      const r = n ? await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cheer", n }) }) : await fetch(api);
      if (r.ok) setS(await r.json());
    }, 2500);
    return () => clearInterval(t);
  }, [api]);

  async function act(body: Record<string, unknown>, ok = "") {
    setMsg("");
    if (!(await ensureFan())) return setMsg("請用 LINE 開啟這個頁面");
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error ?? "失敗了，再試一次");
    setS(j);
    setSheet(null);
    if (ok) setMsg(ok);
  }
  const cheer = () => { pending.current += 1; setMine((n) => n + 1); setS((x) => ({ ...x, hype: Math.min(100, x.hype + 1) })); };
  const lot = s.lottery;
  const openWishes = s.wishes.filter((w) => w.status === "open");
  const practice = s.wishes.filter((w) => w.status === "practice");

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col">
      <header className="row flex h-14 items-center gap-3 px-5">
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sunken text-[13px] font-bold">{/* eslint-disable-next-line @next/next/no-img-element */}{props.avatar ? <img src={props.avatar} alt="" className="h-full w-full object-cover" /> : initialOf(props.name)}</span>
        <span className="flex flex-1 flex-col leading-5"><strong>{props.name}</strong><span className="flex items-center gap-1.5 text-[12px] text-ink2">{s.live ? <><span className="dot-now !h-[7px] !w-[7px]" />演出中・{s.location}・{s.present} 人簽到</> : "目前沒有演出"}</span></span>
        <Link href="/me" className="small underline">我的護照</Link>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {props.gameOn && (
          <Link href={`/p/${props.slug}/game`} className="flex items-center justify-between gap-3 bg-now px-5 py-3 text-ink"><strong>「{props.gameOn}」進行中</strong><span className="btn btn-primary btn-sm">加入</span></Link>
        )}
        {s.live ? (
          <section className="flex flex-col gap-4 px-5 pt-5 pb-6">
            <div><span className="label">正在唱</span><h1 className="h1">{props.nowPlaying ? `〈${props.nowPlaying.title}〉` : "準備中"}</h1><span className="small">{props.nowPlaying ? `${props.nowPlaying.by} 點播` : ""}{props.nextTitle ? `${props.nowPlaying ? "・" : ""}下一首〈${props.nextTitle}〉` : ""}</span></div>
            <div className="flex flex-col gap-2">
              <div className="small flex justify-between"><span>應援 集滿就開安可</span><span className="num font-semibold text-ink">{s.hype}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-sunken"><div className={`h-full rounded-full ${s.hype >= 100 ? "bg-now" : "bg-ink"}`} style={{ width: `${s.hype}%` }} /></div>
            </div>
            <button onClick={cheer} className="btn btn-secondary">{mine ? `應援（你已按 ${mine} 下）` : "應援（免費）"}</button>
          </section>
        ) : (
          <section className="px-5 py-8"><h1 className="h1">演出結束了</h1><p className="small mt-1">追蹤 {props.name}，下次開演會用 LINE 通知你。許願池隨時都可以許願。</p></section>
        )}
        {msg && <p className="mx-5 mb-3 rounded-[12px] bg-sunken px-3 py-2 text-[14px]">{msg}</p>}

        <section className="border-t-2 border-ink">
          {s.live && (
            <>
              <div className="row flex min-h-[72px] items-center gap-3 px-5 py-3">
                <span className="flex flex-1 flex-col"><strong>簽到集章</strong><span className="small">{s.checked ? `已蓋第 ${s.stamps} 章` : `這會是你第 ${s.stamps + 1} 次來看 ${props.name}`}</span></span>
                {s.checked ? <span className="font-bold text-ok">已簽到</span> : <button onClick={() => act({ action: "checkin" })} className="btn btn-primary btn-sm">簽到</button>}
              </div>
              {lot && (
                <div className="row flex min-h-[72px] items-center gap-3 px-5 py-3">
                  <span className="flex flex-1 flex-col"><strong>免費抽獎：{lot.prize}</strong><span className="small">{lot.status === "open" ? `${lot.entries} 人參加・需先簽到` : lot.won ? "你中獎了！請到台前找表演者" : `得主：${lot.winner ?? "無"}`}</span></span>
                  {lot.status === "open" && (lot.joined ? <span className="font-bold text-ok">已參加</span> : <button disabled={!s.checked} onClick={() => act({ action: "join" })} className="btn btn-secondary btn-sm">參加</button>)}
                </div>
              )}
              <button onClick={() => setSheet("hand")} className="row flex min-h-[72px] w-full items-center gap-3 px-5 py-3 text-left">
                <span className="flex flex-1 flex-col"><strong>{s.hand?.status === "waiting" ? "已舉手" : "舉手"}</strong><span className="small">{s.hand?.status === "waiting" ? `等 ${props.name} 點到你・目前 ${s.handsWaiting} 人舉手` : "想上台合唱、想問問題、想祝福"}</span></span><Chevron />
              </button>
            </>
          )}
          <button onClick={() => setSheet("wish")} className="row flex min-h-[72px] w-full items-center gap-3 px-5 py-3 text-left">
            <span className="flex flex-1 flex-col"><strong>許願池</strong><span className="small">{openWishes.length ? `${openWishes.length} 首歌在集氣${practice.length ? `・${practice.length} 首練習中` : ""}` : `許一首 ${props.name} 還不會的歌`}</span></span><Chevron />
          </button>
          {s.chat.length > 0 && (
            <div className="row flex min-h-[72px] items-center gap-3 px-5 py-3">
              <span className="flex flex-1 flex-col"><strong>直播聊天室熱度</strong><span className="small">{s.chat.map((c) => `${c.name} ${c.count}`).join("・")}</span></span>
            </div>
          )}
          <Link href={`/p/${props.slug}?tab=rank`} className="row flex min-h-[72px] items-center gap-3 px-5 py-3"><span className="flex flex-1 flex-col"><strong>排行榜與留言牆</strong><span className="small">本場支持排行、大家的留言</span></span><Chevron /></Link>
          <Link href={`/u/${props.slug}`} className="row flex min-h-[72px] items-center gap-3 px-5 py-3"><span className="flex flex-1 flex-col"><strong>關於 {props.name}</strong><span className="small">演出紀錄、行程、邀請演出</span></span><Chevron /></Link>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] items-center gap-3 border-t-2 border-ink bg-raised px-5 pt-2.5 pb-5">
        <span className="flex flex-1 flex-col leading-5"><span className="text-[12px] text-ink3">排隊</span><strong className="num text-[20px]">{props.waiting} 首</strong></span>
        <Link href={`/p/${props.slug}?tab=wall`} className="btn btn-secondary btn-lg !px-5">支持</Link>
        <Link href={`/p/${props.slug}`} className="btn btn-primary btn-lg">點歌</Link>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/50">
          <button aria-label="關閉" className="flex-1" onClick={() => setSheet(null)} />
          <div role="dialog" className="mx-auto flex max-h-[80dvh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-[20px] border-t-2 border-ink bg-raised p-5 pb-7">
            {sheet === "hand" ? (
              <>
                <div><h2 className="h2">舉手，讓 {props.name} 看到你</h2><p className="small">免費。被點到時會用 LINE 通知你。</p></div>
                <div className="grid grid-cols-3 gap-2">{HANDS.map(([k, l]) => <button key={k} onClick={() => setHand({ ...hand, kind: k })} className={`btn btn-sm !px-1 ${hand.kind === k ? "btn-primary" : "btn-secondary"}`}>{l}</button>)}</div>
                <label className="field">說一句話<input value={hand.text} maxLength={80} onChange={(e) => setHand({ ...hand, text: e.target.value })} placeholder="例：想合唱〈小幸運〉副歌" /></label>
                <button onClick={() => act({ action: "hand", ...hand }, "已舉手")} className="btn btn-primary">舉手</button>
              </>
            ) : (
              <>
                <div><h2 className="h2">{props.name} 的許願池</h2><p className="small">想聽、但歌單裡還沒有的歌。幫別人的願望集氣，表演者決定要練時會通知你。每週可許 3 個願望。</p></div>
                <div className="flex gap-2"><input className="input" value={wish} maxLength={60} onChange={(e) => setWish(e.target.value)} placeholder="歌名與歌手" /><button onClick={() => { if (wish.trim()) act({ action: "wish", title: wish }).then(() => setWish("")); }} className="btn btn-primary">許願</button></div>
                {practice.length > 0 && <div><div className="label mb-1">練習中</div>{practice.map((w) => <div key={w.id} className="row py-2.5"><strong>{w.title}</strong>{w.note && <span className="small block">{w.note}</span>}</div>)}</div>}
                <div>{openWishes.map((w) => (
                  <div key={w.id} className="row flex items-center gap-3 py-2.5"><span className="flex-1"><strong>{w.title}</strong><span className="small block"><span className="num">{w.votes}</span> 人想聽</span></span><button onClick={() => act({ action: "vote", id: w.id, on: !w.mine })} className={`btn btn-sm ${w.mine ? "btn-quiet" : "btn-secondary"}`}>{w.mine ? "已許願" : "我也想聽"}</button></div>
                ))}</div>
              </>
            )}
            {msg && <p className="text-err">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const Chevron = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;
