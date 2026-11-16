"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import jsQR from "jsqr";
import type { PayMethod } from "@/lib/db/schema";

const TYPES: [PayMethod["type"], string][] = [["linepay", "LINE Pay"], ["jkopay", "街口支付"], ["pxpay", "全支付"], ["other", "其他"]];

async function readImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** 先嘗試解出 QR 內容（多半是可直接點開的付款網址）；解不出來就存壓縮圖 */
async function processFile(file: File): Promise<{ qrText: string | null; imageData: string | null }> {
  const img = await readImage(file);
  const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const code = jsQR(data.data, c.width, c.height);
  if (code?.data) return { qrText: code.data, imageData: null };
  const s2 = Math.min(1, 600 / Math.max(img.width, img.height));
  c.width = Math.round(img.width * s2);
  c.height = Math.round(img.height * s2);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return { qrText: null, imageData: c.toDataURL("image/jpeg", 0.85) };
}

export function PayMethodsEditor({ value, onChange }: { value: PayMethod[]; onChange: (v: PayMethod[]) => void }) {
  const [type, setType] = useState<PayMethod["type"]>("linepay");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const r = await processFile(file);
      const label = TYPES.find(([t]) => t === type)![1];
      onChange([...value.filter((m) => m.type !== type), { type, label, ...r }]);
      setNote(r.qrText ? `已讀取 ${label} 收款碼${/^https?:/.test(r.qrText) ? "，觀眾可以直接點開付款" : ""}，記得按儲存` : `沒辦法自動辨識，會以圖片顯示給觀眾，記得按儲存`);
    } catch {
      setNote("讀取失敗，請換一張清楚的截圖");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
        <ul className="border-t border-rule">
          {value.map((m) => (
            <li key={m.type} className="row flex items-center gap-3 py-2.5">
              {m.imageData ? <img src={m.imageData} alt="" className="h-12 w-12 rounded-[8px] object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-sunken text-[11px] font-bold tracking-wider text-ink3">QR</span>}
              <div className="min-w-0 flex-1">
                <strong>{m.label}</strong>
                <div className="small truncate">{m.qrText ? (/^https?:/.test(m.qrText) ? "觀眾可以直接點開付款" : "已辨識收款碼") : "以圖片顯示"}</div>
              </div>
              <button type="button" onClick={() => onChange(value.filter((x) => x.type !== m.type))} className="small underline">移除</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="field w-40">支付方式<select value={type} onChange={(e) => setType(e.target.value as PayMethod["type"])}>{TYPES.map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></label>
        <label className={`btn btn-secondary cursor-pointer ${busy ? "opacity-50" : ""}`}>
          {busy ? "讀取中" : "上傳收款碼截圖"}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      </div>
      {note && <p className="text-[14px] text-ok">{note}</p>}
      <p className="small">LINE Pay：錢包 → 收款 → 截圖你的收款碼。街口、全支付同樣在 App 的「收款」頁截圖。</p>
    </div>
  );
}
