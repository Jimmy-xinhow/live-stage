"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PayMethod } from "@/lib/db/schema";
import { PayMethodsEditor } from "./PayMethodsEditor";
import { AREAS } from "@/lib/areas";
import { PageHead } from "@/components/back/Shell";
import { kindBySlug, type KindSlug } from "@/lib/kinds";

type Profile = {
  slug: string; displayName: string; avatarUrl: string; bio: string; category: "busker" | "service" | "creator" | "other"; themeColor: string;
  city: string | null; district: string;
  thankYouText: string; presetAmounts: number[]; minAmount: number; maxAmount: number; maxQueue: number; avgSongMinutes: number; showAmounts: boolean; hideBranding: boolean; streamDelaySec: number;
};

export function SettingsForm({ paid, pro, initial, gatewayLabel, merchantId, payMethods: pm0, kind }: { paid: boolean; pro: boolean; initial: Profile; gatewayLabel: string; merchantId: string | null; payMethods: PayMethod[]; kind: KindSlug }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [presets, setPresets] = useState(initial.presetAmounts.join(", "));
  const [gw, setGw] = useState({ gateway: "ecpay" as "ecpay" | "newebpay", merchantId: "", hashKey: "", hashIV: "" });
  const [payMethods, setPayMethods] = useState(pm0);
  const [showGw, setShowGw] = useState(!!merchantId);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof Profile>(key: K, v: Profile[K]) => setF((x) => ({ ...x, [key]: v }));
  const k = kindBySlug(kind);

  async function save() {
    setMsg(null);
    const body = { ...f, payMethods, presetAmounts: presets.split(/[,，\s]+/).map(Number).filter((n) => n > 0), gateway: gw.merchantId ? gw : null };
    const r = await fetch("/api/dashboard/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setMsg(r.ok ? { ok: true, text: "已儲存" } : { ok: false, text: j.error ?? "儲存失敗" });
    if (r.ok) { setGw({ ...gw, merchantId: "", hashKey: "", hashIV: "" }); router.refresh(); }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHead title="收款與設定" desc="對外介紹、表演類型、直播網址在「對外頁面」那一頁設定。" />

      {!k.shows.payCode && (
        <p className="small max-w-[620px] rounded-[12px] bg-sunken px-4 py-3">
          線上直播的觀眾不在現場，沒辦法掃你的個人收款碼，所以這個型態只用刷卡金流。下面設定好就能自動確認收款。
        </p>
      )}

      {k.shows.payCode && (
      <section className="sec flex flex-col gap-3">
        <div><h2 className="h2">收款碼</h2><p className="small max-w-[600px]">免申請，馬上能用。放上你平常用的 LINE Pay／街口收款碼；觀眾點歌後拿到 4 碼點歌碼，轉帳時填在備註，你看到入帳後按「已收到」，那首歌就排進隊伍。</p></div>
        <PayMethodsEditor value={payMethods} onChange={setPayMethods} />
      </section>

      )}

      <section className="sec flex flex-col gap-3">
        <button type="button" onClick={() => setShowGw((x) => !x)} className="flex w-full items-baseline gap-3 text-left">
          <h2 className="h2">刷卡（選用）</h2><span className="small">信用卡、Apple Pay 自動確認，聽眾付完款直接進排隊，不用你手動確認</span>
          <span className="small ml-auto shrink-0 underline">{showGw ? "收合" : "展開"}</span>
        </button>
        {showGw && <>
        <p className="small max-w-[600px]">目前：<strong>{gatewayLabel}</strong>{merchantId ? `（商店代號 ${merchantId}）` : ""}。個人身分就能申請綠界或藍新，申請後把商店代號與 HashKey／HashIV 貼到這裡。平台只用金鑰產生付款單與驗證結果，不會碰到款項。</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="field">金流<select value={gw.gateway} onChange={(e) => setGw({ ...gw, gateway: e.target.value as "ecpay" | "newebpay" })}><option value="ecpay">綠界 ECPay</option><option value="newebpay">藍新 NewebPay</option></select></label>
          <label className="field">商店代號<input placeholder="MerchantID" value={gw.merchantId} onChange={(e) => setGw({ ...gw, merchantId: e.target.value })} /></label>
          <label className="field">HashKey<input value={gw.hashKey} onChange={(e) => setGw({ ...gw, hashKey: e.target.value })} /></label>
          <label className="field">HashIV<input value={gw.hashIV} onChange={(e) => setGw({ ...gw, hashIV: e.target.value })} /></label>
        </div>
        <p className="small">綠界：廠商後台 → 系統開發管理 → 系統介接設定。藍新：會員中心 → 商店管理 → 商店資料設定 → API 串接金鑰。金鑰以 AES-256 加密保存。</p>
        </>}
      </section>

      <section className="sec flex flex-col gap-4">
        <h2 className="h2">基本資料</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">顯示名稱<input value={f.displayName} onChange={(e) => set("displayName", e.target.value)} /></label>
          <label className="field">網址代號（/u/代號）<input value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></label>
          <label className="field">主要演出縣市
            <select value={f.city ?? ""} onChange={(e) => set("city", e.target.value || null)}>
              <option value="">請選擇</option>
              {AREAS.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
            </select>
          </label>
          <label className="field">常駐地點或行政區<input placeholder="例：鹽埕區・駁二" value={f.district} onChange={(e) => set("district", e.target.value)} /></label>
        </div>
        <label className="field">大頭貼網址（留空用名字第一個字）<input value={f.avatarUrl} onChange={(e) => set("avatarUrl", e.target.value)} /></label>
        <label className="field">付款後的感謝訊息<input value={f.thankYouText} onChange={(e) => set("thankYouText", e.target.value)} /></label>
      </section>

      <section className="sec flex flex-col gap-4">
        <h2 className="h2">點歌規則</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="field">排隊上限（首）<input className="num" type="number" value={f.maxQueue} onChange={(e) => set("maxQueue", Number(e.target.value))} /></label>
          <label className="field">每首平均分鐘<input className="num" type="number" value={f.avgSongMinutes} onChange={(e) => set("avgSongMinutes", Number(e.target.value))} /></label>
          <label className="field">打賞最低（NT$）<input className="num" type="number" value={f.minAmount} onChange={(e) => set("minAmount", Number(e.target.value))} /></label>
          <label className="field">單筆最高（NT$）<input className="num" type="number" value={f.maxAmount} onChange={(e) => set("maxAmount", Number(e.target.value))} /></label>
        </div>
        <label className="field">打賞的預設金額（逗號分隔）<input className="num" value={presets} onChange={(e) => setPresets(e.target.value)} /></label>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={f.showAmounts} onChange={(e) => set("showAmounts", e.target.checked)} />公開顯示金額</label>
          {paid ? (
            <>
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-[#151412]" checked={f.hideBranding} onChange={(e) => set("hideBranding", e.target.checked)} />點歌頁不顯示平台名稱</label>
              {pro && (
                <label className="field max-w-[260px]">
                  <span>直播畫面延遲（秒）</span>
                  <input className="input num" inputMode="numeric" value={f.streamDelaySec}
                    onChange={(e) => set("streamDelaySec", Math.max(0, Math.min(120, Number(e.target.value.replace(/\D/g, "")) || 0)))} />
                  <span className="small">OBS 疊層會標「比畫面快約 N 秒」。填 0 就不顯示。</span>
                </label>
              )}
            </>
          ) : (
            <p className="small">點歌頁移除平台標記是點歌台方案以上的功能。<a href="/dashboard/plan" className="underline">看方案</a></p>
          )}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t-2 border-ink bg-raised px-5 py-3">
        <button onClick={save} className="btn btn-primary">儲存設定</button>
        {msg && <span className={`text-[14px] ${msg.ok ? "text-ok" : "text-err"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
