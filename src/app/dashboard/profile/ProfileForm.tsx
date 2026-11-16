"use client";

import Link from "next/link";
import { useState } from "react";
import { ACTS, OCCASIONS, streamInfo } from "@/lib/acts";
import { AREAS } from "@/lib/areas";

type Init = { actType: string; bio: string; genres: string; bookable: boolean; priceFrom: number | null; occasions: string[]; serviceAreas: string[]; coverUrl: string; videoUrl: string; streamUrl: string; lat: string; lng: string };

export function ProfileForm(props: { slug: string; baseUrl: string; city: string | null; init: Init; overlayToken: string | null; chatEnabled: boolean }) {
  const [f, setF] = useState(props.init);
  const [token, setToken] = useState(props.overlayToken);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Init>(k: K, v: Init[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: "occasions" | "serviceAreas", v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);
  const info = streamInfo(f.streamUrl);
  const overlay = token ? `${props.baseUrl}/overlay/${props.slug}?k=${token}` : "";

  async function save(resetOverlay = false) {
    setBusy(true); setMsg("");
    const r = await fetch("/api/dashboard/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, resetOverlay }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "儲存失敗");
    setToken(j.overlayToken);
    setMsg("已儲存");
  }
  const chip = (on: boolean) => `tag h-9 px-3 text-[13px] ${on ? "bg-ink text-paper" : "tag-quiet bg-raised"}`;

  return (
    <div className="flex flex-col gap-8">
      <div><h1 className="h1">對外頁面</h1><p className="small">這些資料會出現在你的作品集頁與搜尋結果。<Link href={`/u/${props.slug}`} className="underline">看我的頁面</Link>{!props.city && <>　還沒選演出縣市，請先到<Link href="/dashboard/settings" className="underline">設定</Link>選擇，才會被找到。</>}</p></div>

      <section className="sec grid gap-4 md:grid-cols-2">
        <label className="field">表演類型<select value={f.actType} onChange={(e) => set("actType", e.target.value)}>{ACTS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></label>
        <label className="field">曲風或專長<input value={f.genres} maxLength={60} onChange={(e) => set("genres", e.target.value)} placeholder="例：華語流行、爵士、台語老歌" /></label>
        <label className="field md:col-span-2">介紹（寫事實：唱多久、常在哪、擅長什麼）<textarea value={f.bio} maxLength={400} onChange={(e) => set("bio", e.target.value)} /></label>
        <label className="field">主圖網址（直式 4:5 實拍照）<input value={f.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} placeholder="https://" /></label>
        <label className="field">演出影片網址（YouTube）<input value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://www.youtube.com/watch?v=" /></label>
        <label className="field">常駐地點緯度（可不填，地圖會更準）<input className="num" value={f.lat} onChange={(e) => set("lat", e.target.value)} placeholder="22.6224" /></label>
        <label className="field">常駐地點經度<input className="num" value={f.lng} onChange={(e) => set("lng", e.target.value)} placeholder="120.2823" /></label>
      </section>

      <section className="sec flex flex-col gap-4">
        <h2 className="h3">接受邀約</h2>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={f.bookable} onChange={(e) => set("bookable", e.target.checked)} className="h-5 w-5 accent-ink" />開放婚禮、活動、店家邀請我演出</label>
        <label className="field max-w-[280px]">每場起價（NT$，可留空＝面議）<input type="number" min={0} value={f.priceFrom ?? ""} onChange={(e) => set("priceFrom", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <div><div className="label mb-2">可接場合</div><div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <button key={o} type="button" onClick={() => toggle("occasions", o)} className={chip(f.occasions.includes(o))}>{o}</button>)}</div></div>
        <div><div className="label mb-2">除了主要縣市，還可以去</div><div className="flex flex-wrap gap-2">{AREAS.map((a) => <button key={a.slug} type="button" onClick={() => toggle("serviceAreas", a.slug)} className={chip(f.serviceAreas.includes(a.slug))}>{a.short}</button>)}</div></div>
      </section>

      <section className="sec flex flex-col gap-4">
        <div><h2 className="h3">直播串接</h2><p className="small">在你習慣的平台開直播，線上粉絲到這裡點歌、支持，和現場排同一個隊伍。款項直接進你自己的金流。</p></div>
        <label className="field">這場直播的網址<input value={f.streamUrl} onChange={(e) => set("streamUrl", e.target.value)} placeholder="https://www.youtube.com/live/…" /></label>
        {info?.platform === "youtube" && (
          <p className="rounded-[12px] border border-rule bg-raised p-3 text-[14px]">
            {props.chatEnabled
              ? <><strong>聊天室會一起計入。</strong>開演後，YouTube 聊天室的留言會顯示在大螢幕與疊加畫面，也會累積應援能量與聊天室熱度排行（看留言數，不是金額）。</>
              : <><strong>聊天室未啟用。</strong>平台還沒設定 YouTube 金鑰（YOUTUBE_API_KEY），設定後這場直播的聊天室就會自動接上。</>}
          </p>
        )}
        {info && (info.safe
          ? <p className="rounded-[12px] border border-rule bg-sunken p-3 text-[14px]"><strong>{info.name}・安全模式。</strong>這個平台限制直播中把觀眾導到站外，疊加畫面只顯示正在唱、排隊和排行，不出現 QR Code、金額和支持提示。</p>
          : <p className="rounded-[12px] border border-rule bg-raised p-3 text-[14px]"><strong>{info.name}・完整模式。</strong>{info.embed ? "觀眾頁會嵌入直播畫面，" : "這個平台無法嵌入，觀眾頁會顯示「前往觀看」按鈕，"}疊加畫面可以顯示通知與掃碼。</p>)}
        <div>
          <div className="label mb-2">OBS 疊加畫面（瀏覽器來源，寬 1920、高 1080）</div>
          {overlay ? (
            <div className="flex flex-wrap gap-2"><input readOnly value={overlay} className="input min-w-0 flex-1 !text-[13px]" /><button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(overlay).then(() => setMsg("已複製網址"))}>複製</button><a href={`${overlay}&preview=1`} target="_blank" className="btn btn-quiet">預覽</a><button type="button" className="btn btn-quiet" onClick={() => save(true)}>重設</button></div>
          ) : <p className="small">儲存一次後會產生你的專屬網址。</p>}
        </div>
      </section>

      <div className="flex items-center gap-4"><button disabled={busy} onClick={() => save()} className="btn btn-primary btn-lg">儲存</button>{msg && <span className={msg.startsWith("已") ? "text-ok" : "text-err"}>{msg}</span>}</div>
    </div>
  );
}
