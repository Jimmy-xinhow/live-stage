"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { orderStatus } from "@/lib/orders";
import type { PublicPayMethod } from "@/lib/paymethods";
import { Avatar } from "@/components/Avatar";
import { nt } from "@/lib/format";
import { getJson, request } from "@/lib/net";
import { FollowButton } from "@/components/FollowButton";
import type { FanInfo } from "@/components/useFan";

type S = NonNullable<Awaited<ReturnType<typeof orderStatus>>>;

export function OrderTracker({ tradeNo, initial, methods, ttlMin, follow }: { tradeNo: string; initial: S; methods: PublicPayMethod[]; ttlMin: number; follow: { following: boolean; fan: FanInfo;} }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(0);
  const [shaky, setShaky] = useState(false);
  const p = s.performer;

  useEffect(() => {
    let stop = false;
    const final = (x: S) => x.status === "failed" || (x.status === "paid" && (x.kind === "tip" || x.queueStatus === "done" || x.queueStatus === "skipped"));
    let misses = 0;
    const tick = async () => {
      const r = await getJson<S>(`/api/orders/${tradeNo}`);
      if (stop) return;
      if (r) { setS(r); misses = 0; setShaky(false); }
      else { misses += 1; if (misses >= 2) setShaky(true); }
      if (!(r && final(r))) setTimeout(tick, misses ? Math.min(20_000, 4000 * 2 ** misses) : 4000);
    };
    const t = setTimeout(tick, 1500);
    const back = () => { setShaky(false); tick(); };
    window.addEventListener("online", back);
    return () => { stop = true; clearTimeout(t); window.removeEventListener("online", back); };
  }, [tradeNo]);

  async function claim() {
    setBusy(true);
    // 「我轉好了」重送是安全的：伺服器只是把同一筆標成已通知表演者
    await request(`/api/orders/${tradeNo}/claim`, { method: "POST" }, { idempotent: true }).catch(() => null);
    setS((x) => ({ ...x, claimed: true }));
    setBusy(false);
  }

  const header = (
    <>
      {shaky && (
        <p role="status" aria-live="polite" className="border-b-2 border-ink bg-sunken px-4 py-2 text-[14px] text-ink2">
          連線不太穩，狀態可能慢一點更新。你的訂單已經送出去了，不會因為這樣消失。
        </p>
      )}
    <header className="row flex h-14 items-center gap-3">
      <Avatar src={p.avatar} name={p.name} size={32} color="#6b665c" />
      <strong className="flex-1">{p.name}</strong>
      <Link href={`/p/${p.slug}`} className="small underline">回歌單</Link>
    </header>
    </>
  );
  const quote = <blockquote className="mt-5 border-l-2 border-ink pl-4 text-left text-[17px] leading-7">「{p.thankYou}」<span className="small block">— {p.name}</span></blockquote>;

  /* ── 免申請模式：等待轉帳／表演者確認 ── */
  if (s.payMode === "manual" && (s.status === "awaiting" || s.status === "expired")) {
    const code = s.payCode ?? "----";
    if (s.status === "expired")
      return (
        <main className="mx-auto max-w-[480px] px-5 pb-10">
          {header}
          <h1 className="h1 mt-8">超過時間，這筆先暫停</h1>
          <p className="small mt-1">如果你已經轉帳，把這組點歌碼給表演者看，他可以直接補確認。</p>
          <div className="num mt-5 rounded-[16px] bg-sunken py-6 text-center text-[48px] font-bold leading-[56px] tracking-[.3em]">{code}</div>
          <Link href={`/p/${p.slug}`} className="btn btn-secondary btn-block mt-8">回到歌單</Link>
        </main>
      );
    return (
      <main className="mx-auto max-w-[480px] px-5 pb-10">
        {header}
        {s.claimed ? (
          <div className="pt-8">
            <span className="label">等待確認</span>
            <h1 className="h1">等 {p.name} 確認收款</h1>
            <p className="small mt-1">他看到入帳就會按確認，{s.itemTitle ? "確認後立刻排進隊伍。" : "這一頁會自動更新。"}</p>
            <dl className="mt-5 border-t-2 border-ink">
              <div className="row flex items-center justify-between py-3"><dt className="small">點歌碼</dt><dd className="num text-[24px] font-bold tracking-[.2em]">{code}</dd></div>
              <div className="row flex items-center justify-between py-3"><dt className="small">金額</dt><dd className="num font-bold">{nt(s.amount)}</dd></div>
              {s.itemTitle && <div className="row flex items-center justify-between py-3"><dt className="small">歌曲</dt><dd className="font-bold">〈{s.itemTitle}〉</dd></div>}
            </dl>
          </div>
        ) : (
          <>
            <div className="pt-6">
              <span className="label">{s.itemTitle ? `點歌〈${s.itemTitle}〉` : "打賞"}・請轉帳</span>
              <div className="num text-[40px] font-bold leading-[52px]">{nt(s.amount)}</div>
            </div>
            <div className="mt-4 rounded-[16px] bg-ink p-5 text-center text-paper">
              <div className="text-[13px] text-paper/75">轉帳時「備註」填這組點歌碼</div>
              <div className="num mt-1 text-[48px] font-bold leading-[56px] tracking-[.3em]">{code}</div>
              <button onClick={() => navigator.clipboard?.writeText(code)} className="mt-2 rounded-[10px] border border-paper/40 px-3 py-1.5 text-[13px]">複製點歌碼</button>
            </div>

            <div className="mt-5 border-t-2 border-ink">
              {methods.map((m, i) => (
                <div key={i} className="row py-1">
                  <button onClick={() => setOpen(open === i ? -1 : i)} className="flex min-h-[52px] w-full items-center gap-2 text-left font-bold">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: m.color }} />用 {m.label} 付款
                    <span className="small ml-auto">{open === i ? "收合" : "展開"}</span>
                  </button>
                  {open === i && (
                    <div className="pb-4 text-center">
                      {m.href && <a href={m.href} className="btn btn-primary btn-block">開啟 {m.label}</a>}
                      <div className="mx-auto mt-3 w-52 rounded-[12px] border border-rule bg-white p-2">
                        {m.qrSvg ? <div dangerouslySetInnerHTML={{ __html: m.qrSvg }} /> : m.imageData ? <img src={m.imageData} alt={`${m.label} 收款碼`} /> : null}
                      </div>
                      <p className="small mt-2">{m.href ? "按上面按鈕，或" : ""}長按儲存收款碼，在 {m.label} 的「掃描」選相簿。在現場也可以直接掃台前的收款碼。</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <ol className="mt-5 flex flex-col gap-1 text-[14px] text-ink2">
              <li><span className="num mr-2 font-bold text-ink">1</span>用上面的收款碼轉帳 <strong className="num text-ink">{nt(s.amount)}</strong></li>
              <li><span className="num mr-2 font-bold text-ink">2</span>備註填 <strong className="num text-ink">{code}</strong></li>
              <li><span className="num mr-2 font-bold text-ink">3</span>回來按「我付好了」，表演者確認後{s.itemTitle ? "排進隊伍" : "這一頁會變成已收到"}</li>
            </ol>
            <button disabled={busy} onClick={claim} className="btn btn-primary btn-lg btn-block mt-5">我付好了</button>
            <p className="small mt-2 text-center">{ttlMin} 分鐘內沒有確認會自動取消；沒付款不會產生費用。</p>
          </>
        )}
      </main>
    );
  }

  /* ── 已付款／刷卡流程 ── */
  let big: React.ReactNode;
  if (s.status === "pending") big = <><h1 className="h1">確認付款中</h1><p className="small mt-1">通常幾秒內完成，請不要關閉這一頁。</p></>;
  else if (s.status === "failed") big = <><h1 className="h1">{s.payMode === "manual" ? "表演者沒有查到這筆轉帳" : "付款沒有完成"}</h1><p className="small mt-1">{s.payMode === "manual" ? "這筆已取消。確定已付款的話，請直接跟表演者說。" : "沒有扣款，可以再試一次。"}</p></>;
  else if (s.kind === "tip") big = <><span className="label">打賞完成</span><h1 className="num text-[40px] font-bold leading-[52px]">{nt(s.amount)}</h1>{quote}</>;
  else if (s.queueStatus === "playing") big = <div className="animate-pop"><span className="tag tag-now">正在唱</span><h1 className="h-display mt-2">現在唱的是你點的歌</h1></div>;
  else if (s.queueStatus === "done") big = <><h1 className="h1">唱完了，謝謝你的點播</h1>{quote}</>;
  else if (s.queueStatus === "skipped") big = <><h1 className="h1">這首這次沒辦法唱</h1><p className="small mt-1">退款請直接向表演者詢問。</p></>;
  else
    big = (
      <>
        <span className="label">你前面還有</span>
        <div className="flex items-baseline gap-2"><span className="num text-[88px] font-bold leading-[96px]">{s.ahead ?? "–"}</span><span className="h2">首</span></div>
        {s.etaMinutes ? <span className="small">約 {s.etaMinutes} 分鐘</span> : null}
        {s.ahead != null && s.ahead <= 1 ? <div className="mt-2 font-bold text-nowtext">下一首就是你的</div> : null}
      </>
    );

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-10">
      {header}
      <section className="pt-8">
        {s.itemTitle && <div className="mb-3 text-[17px] font-bold">〈{s.itemTitle}〉</div>}
        {big}
      </section>
      {s.reply && <div className="mt-6 rounded-[12px] bg-sunken px-4 py-3 text-[14px] leading-6"><strong>{p.name} 回覆：</strong>{s.reply}</div>}
      {s.status === "paid" && (
        <div className="mt-8">
          <FollowButton key={String(s.following ?? follow.following)} slug={p.slug} name={p.name} initialFollowing={s.following ?? follow.following} fan={follow.fan} color={p.color} />
        </div>
      )}
      {s.status === "paid" && s.itemTitle && <a href={`/api/card/${tradeNo}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-block mt-3">存下點歌回憶卡</a>}
      <Link href={`/p/${p.slug}`} className="btn btn-quiet btn-block mt-3">{s.status === "failed" ? "回去重新點" : "回到歌單"}</Link>
    </main>
  );
}
