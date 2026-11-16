"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicState } from "@/lib/orders";
import { CATEGORY_LABEL, initial as initialOf, nt, timeAgo } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { submitForm } from "@/lib/liff-client";
import { followApi, useFan, type FanInfo } from "@/components/useFan";
import { RankTab } from "./RankTab";

type MenuRow = { id: string; title: string; subtitle: string; category: string; price: number; enabled: boolean; hot: number };
type Perf = { slug: string; name: string; avatar: string | null; bio: string; category: string; color: string; presets: number[]; min: number; max: number; manualLabel: string };
type Sheet = { kind: "request"; item: MenuRow } | { kind: "tip" } | null;

export function PerformerApp(props: {
  performer: Perf; menu: MenuRow[]; initialState: PublicState; fan: FanInfo; initialFollowing: boolean; nextShow: { when: string; location: string; note: string } | null;
  liffId: string; devLogin: boolean; oaUrl: string; appName: string; initialTab?: "menu" | "queue" | "rank" | "wall";
  area?: { slug: string; name: string } | null; district?: string;
}) {
  const { performer: p, menu, liffId } = props;
  const [state, setState] = useState(props.initialState);
  const [tab, setTab] = useState<"menu" | "queue" | "rank" | "wall">(props.initialTab ?? "menu");
  const { fan, ensureFan, liffOk } = useFan(props.fan, liffId, props.devLogin);
  const [following, setFollowing] = useState(props.initialFollowing);
  const [followers, setFollowers] = useState(props.initialState.followers);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("全部");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");

  // 即時狀態：排隊、演出中、留言牆
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const s = await fetch(`/api/p/${p.slug}/state`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (s && !stop) setState(s);
      if (!stop) setTimeout(tick, 5000);
    };
    const t = setTimeout(tick, 5000);
    return () => { stop = true; clearTimeout(t); };
  }, [p.slug]);

  async function toggleFollow() {
    if (!(await ensureFan())) {
      if (!liffOk) setToast("請用 LINE 開啟此頁面後再追蹤");
      return;
    }
    const next = !following;
    if (await followApi(p.slug, next)) {
      setFollowing(next);
      setFollowers((n) => n + (next ? 1 : -1));
      if (next) setToast(props.oaUrl ? "已追蹤！記得加 LINE 好友才收得到開唱通知" : "已追蹤！開唱時會通知你");
    }
  }

  const cats = useMemo(() => ["全部", ...Array.from(new Set(menu.map((m) => m.category).filter(Boolean)))], [menu]);
  const hotIds = useMemo(() => new Set([...menu].filter((m) => m.hot > 0).sort((a, b) => b.hot - a.hot).slice(0, 3).map((m) => m.id)), [menu]);
  const shown = menu.filter((m) => (cat === "全部" || m.category === cat) && (!q || `${m.title}${m.subtitle}`.toLowerCase().includes(q.toLowerCase())));
  const waiting = state.queue.filter((x) => x.status === "waiting").length;
  const playing = state.queue.find((x) => x.status === "playing");
  const canRequest = !!state.live && state.queueOpen && state.accepting && waiting < state.maxQueue;
  const requestBlock = !state.accepting ? "藝人暫停接單中" : !state.live ? "藝人目前沒有在演出" : !state.queueOpen ? "藝人暫停點播" : waiting >= state.maxQueue ? "排隊已滿，稍後再點" : "";

  const TABS = [["menu", "歌單"], ["queue", waiting ? `排隊 ${waiting}` : "排隊"], ["rank", "排行"], ["wall", "留言"]] as const;
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] pb-32">
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-[22px] font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : initialOf(p.name)}
          </span>
          <div className="min-w-0 flex-1">
            <span className="label">
              {props.area ? <a href={`/area/${props.area.slug}`} className="underline">{props.area.name}</a> : null}
              {props.area ? "・" : ""}{CATEGORY_LABEL[p.category] ?? "表演者"}{props.district ? `・${props.district}` : ""}
            </span>
            <h1 className="h1 !leading-8">{p.name}</h1>
            <span className="small"><span className="num">{followers}</span> 位粉絲・<a href={`/u/${p.slug}`} className="underline">關於</a>・<a href="/me" className="underline">我的護照</a></span>
          </div>
          <button onClick={toggleFollow} className={`btn btn-sm shrink-0 ${following ? "btn-quiet" : "btn-secondary"}`}>{following ? "已追蹤" : "追蹤"}</button>
        </div>
        {p.bio && <p className="mt-3 text-[14px] leading-6 text-ink2">{p.bio}</p>}
        <div className="mt-4 flex min-h-[44px] items-center gap-2 rounded-[12px] bg-sunken px-3 py-2 text-[14px]">
          {state.live ? (
            <><span className="dot-now shrink-0" /><span><strong>演出中</strong>{state.live.location ? `・${state.live.location}` : ""}・排隊 <span className="num">{waiting}</span> 首</span></>
          ) : (
            <span className="text-ink2">{props.nextShow ? `下次演出：${props.nextShow.when}・${props.nextShow.location}` : "目前沒有演出。追蹤後，開演時會用 LINE 通知你"}</span>
          )}
        </div>
      </header>

      {playing && (
        <section className="border-t-2 border-ink px-5 py-4">
          <span className="label text-nowtext">正在唱</span>
          <div className="h2">〈{playing.title}〉</div>
          <div className="small">{playing.badge ? `${playing.badge} ` : ""}{playing.name} 點播{playing.message ? `・「${playing.message}」` : ""}</div>
        </section>
      )}

      <nav className="sticky top-0 z-10 flex border-y-2 border-ink bg-paper">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k} className={`h-12 flex-1 text-[14px] ${tab === k ? "bg-ink font-bold text-paper" : "font-medium text-ink2"}`}>{label}</button>
        ))}
      </nav>

      {tab === "menu" && (
        <section className="px-5 pt-4">
          {requestBlock && <p className="mb-3 rounded-[12px] bg-sunken px-3 py-2 text-[14px] text-ink2">{requestBlock}，歌單可以先看。</p>}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋歌名或歌手" className="input" />
          {cats.length > 2 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`tag shrink-0 !h-8 !px-3 !text-[13px] ${cat === c ? "!bg-ink !text-paper" : "tag-quiet"}`}>{c}</button>
              ))}
            </div>
          )}
          <ul className="mt-3 border-t border-rule">
            {shown.map((m) => (
              <li key={m.id} className={`row flex min-h-[68px] items-center gap-3 py-3 ${m.enabled ? "" : "opacity-45"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold"><span className="truncate">{m.title}</span>{hotIds.has(m.id) && <span className="tag tag-now !h-5 !px-1.5 !text-[11px]">常點</span>}</div>
                  <div className="small truncate">{[m.subtitle, m.category].filter((x, i, a) => x && a.indexOf(x) === i).join("・")}</div>
                </div>
                <button disabled={!m.enabled || !canRequest} onClick={() => setSheet({ kind: "request", item: m })} className="btn btn-secondary btn-sm shrink-0">
                  {m.enabled ? <>點歌 <span className="num">{nt(m.price)}</span></> : "暫停"}
                </button>
              </li>
            ))}
            {!shown.length && <li className="small py-8 text-center">找不到這首。換個關鍵字，或到互動中心的許願池許願。</li>}
          </ul>
        </section>
      )}

      {tab === "queue" && (
        <section className="px-5 pt-2">
          {state.queue.length ? (
            <ol>
              {state.queue.map((x, i) => (
                <li key={x.id} className="row flex min-h-[64px] items-center gap-3 py-3">
                  <span className="num w-8 shrink-0 text-[20px] font-bold text-ink3">{x.status === "playing" ? <span className="dot-now" /> : i}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{x.title}</div>
                    <div className="small truncate">{x.badge ? `${x.badge} ` : ""}{x.name}{x.message ? `・${x.message}` : ""}</div>
                  </div>
                  {x.status === "playing" ? <span className="tag tag-now">正在唱</span> : <span className="small num shrink-0">約 {i * state.avgSongMinutes} 分</span>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="small py-10 text-center">{state.live ? "現在沒有人排隊，點了下一首就是你的。" : "演出開始後會顯示點歌順序。"}</p>
          )}
        </section>
      )}

      {tab === "rank" && <RankTab slug={p.slug} live={!!state.live} onLogin={ensureFan} />}

      {tab === "wall" && (
        <section className="px-5 pt-2">
          <ul>
            {state.wall.map((w) => (
              <li key={w.id} className="row flex gap-3 py-3">
                <Avatar src={w.avatar} name={w.name} size={36} color="#6b665c" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-[14px]">
                    <strong>{w.badge && <span className="mr-0.5">{w.badge}</span>}{w.name}</strong>
                    {w.amount != null && <span className="num font-semibold">{nt(w.amount)}</span>}
                    <span className="small ml-auto shrink-0 !text-[12px]">{timeAgo(w.paidAt)}</span>
                  </div>
                  <div className="small">{w.itemTitle ? `點了〈${w.itemTitle}〉` : "打賞"}</div>
                  {w.message && <p className="break-words">{w.message}</p>}
                  {w.reply && <div className="mt-1.5 rounded-[12px] bg-sunken px-3 py-2 text-[14px] leading-6"><strong>{p.name}：</strong>{w.reply}</div>}
                </div>
              </li>
            ))}
            {!state.wall.length && <li className="small py-10 text-center">還沒有留言。點歌或打賞時寫的話會出現在這裡。</li>}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] flex-col gap-1.5 border-t-2 border-ink bg-raised px-5 pt-3 pb-4">
        <div className="flex gap-3">
          {state.live && <a href={`/p/${p.slug}/hub`} className="btn btn-secondary btn-lg !px-5">互動</a>}
          <button disabled={!state.accepting} onClick={() => setSheet({ kind: "tip" })} className="btn btn-primary btn-lg flex-1">打賞 {p.name}</button>
        </div>
        <p className="text-center text-[12px] leading-4 text-ink3">款項直接付給表演者，{props.appName}不經手</p>
      </div>

      {toast && (
        <div onClick={() => setToast("")} className="fixed inset-x-0 top-4 z-40 mx-auto w-fit max-w-[90%] rounded-[12px] bg-ink px-4 py-2.5 text-[14px] text-paper">
          {toast}
          {props.oaUrl && following && <a href={props.oaUrl} className="ml-2 underline">加好友</a>}
        </div>
      )}

      {sheet && <OrderSheet sheet={sheet} p={p} fan={fan} following={following} ahead={(playing ? 1 : 0) + waiting} avg={state.avgSongMinutes} opts={state.payOptions} onClose={() => setSheet(null)} />}
    </main>
  );
}

function OrderSheet({ sheet, p, fan, following, ahead, avg, opts, onClose }: { sheet: NonNullable<Sheet>; p: Perf; fan: FanInfo; following: boolean; ahead: number; avg: number; opts: { manual: boolean; auto: boolean }; onClose: () => void }) {
  const base = sheet.kind === "request" ? sheet.item.price : (p.presets[1] ?? p.presets[0] ?? p.min);
  const [amount, setAmount] = useState(base);
  const [nickname, setNickname] = useState(fan?.name ?? "");
  const [message, setMessage] = useState("");
  const [anon, setAnon] = useState(false);
  const [follow, setFollow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chips = sheet.kind === "request" ? [base, base + 50, base + 100] : p.presets;

  async function pay(payMode: "manual" | "auto") {
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: p.slug, menuItemId: sheet.kind === "request" ? sheet.item.id : null, amount, nickname, message, isAnonymous: anon, payMode, followOnPay: follow }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "建立訂單失敗");
      if (j.redirect) location.href = j.redirect;
      else submitForm(j.action, j.fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生錯誤");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50">
      <button aria-label="關閉" className="flex-1" onClick={onClose} />
      <div role="dialog" className="mx-auto flex max-h-[92dvh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-[20px] border-t-2 border-ink bg-raised p-5 pb-7">
        {sheet.kind === "request" ? (
          <div>
            <span className="label">點歌</span>
            <h2 className="h2">〈{sheet.item.title}〉</h2>
            <p className="small">{ahead <= 1 ? "付款確認後，下一首就唱這首。" : `付款確認後前面還有 ${ahead} 首，約 ${ahead * avg} 分鐘。`}</p>
          </div>
        ) : (
          <div><span className="label">打賞</span><h2 className="h2">{p.name}</h2></div>
        )}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {chips.slice(0, 6).map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={`btn btn-sm num !px-1 ${amount === v ? "btn-primary" : "btn-secondary"}`}>{nt(v)}</button>
            ))}
          </div>
          <label className="field">自訂金額（NT$）<input className="num" inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "").slice(0, 6)) || 0)} /></label>
        </div>
        <label className="field">暱稱<input value={nickname} disabled={anon} onChange={(e) => setNickname(e.target.value.slice(0, 30))} placeholder="會顯示在排隊與留言牆" /></label>
        <label className="field">{sheet.kind === "request" ? "想說的話、要送給誰" : "想對他說的話"}<input value={message} onChange={(e) => setMessage(e.target.value.slice(0, 120))} placeholder="表演者會看到，可以不填" /></label>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink2">
          <label className="flex min-h-[28px] items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={anon} onChange={(e) => setAnon(e.target.checked)} />匿名</label>
          {fan && !following && <label className="flex min-h-[28px] items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={follow} onChange={(e) => setFollow(e.target.checked)} />追蹤 {p.name}，開演通知我</label>}
        </div>
        {!fan && <p className="small">用 LINE 開啟這一頁，可以收到「快輪到你」通知與表演者的回覆。</p>}
        {error && <p className="rounded-[12px] bg-sunken px-3 py-2 text-[14px] text-err">{error}</p>}
        <div className="flex flex-col gap-2">
          {opts.manual && (
            <button disabled={busy || !amount} onClick={() => pay("manual")} className="btn btn-primary btn-lg btn-block">
              {busy ? "處理中" : <>用 {p.manualLabel} 轉帳 <span className="num">{nt(amount)}</span></>}
            </button>
          )}
          {opts.auto && (
            <button disabled={busy || !amount} onClick={() => pay("auto")} className={`btn btn-lg btn-block ${opts.manual ? "btn-secondary" : "btn-primary"}`}>
              {busy && !opts.manual ? "前往付款" : <>信用卡・Apple Pay <span className="num">{nt(amount)}</span></>}
            </button>
          )}
          {opts.manual && <p className="small text-center">送出後會給你 4 碼點歌碼，轉帳時填在備註。</p>}
        </div>
      </div>
    </div>
  );
}
