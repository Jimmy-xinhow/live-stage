"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 開演公告一鍵成圖。
 *
 * 在瀏覽器端用 canvas 畫，不在伺服器轉圖——伺服器的執行環境不保證裝了中文字體，
 * 那種錯誤在本機看不出來、上線才變成滿畫面豆腐。瀏覽器這邊字體是頁面已經載好的，
 * 而且使用者按下去就有圖，不必等伺服器。
 *
 * 尺寸 1080×1920 是 IG 限動與 FB 限時動態的標準比例。
 */

const W = 1080, H = 1920;
const NIGHT = "#0d1117", BONE = "#f2efe9", DIM = "#9ba6b4", SODIUM = "#ffb03a", WASH = "#e8356d";

type Props = { slug: string; name: string; defaultWhere: string };

export function Poster({ slug, name, defaultWhere }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const qr = useRef<HTMLImageElement | null>(null);
  const [when, setWhen] = useState("今晚 20:00");
  const [where, setWhere] = useState(defaultWhere);
  const [note, setNote] = useState("想聽什麼直接點，錢直接進表演者的帳戶");
  const [ready, setReady] = useState(false);

  // QR 先load好，畫的時候才不會缺一塊
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { qr.current = img; setReady(true); };
    img.src = `/api/qr/${slug}?f=png&s=640&c=%230d1117`;
  }, [slug]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    // 等字體真的可用，否則第一次畫出來會是系統預設字
    (document.fonts?.ready ?? Promise.resolve()).then(() => { if (!cancelled) draw(); });
    return () => { cancelled = true; };
  }, [ready, when, where, note, name]);

  function draw() {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;

    g.fillStyle = NIGHT;
    g.fillRect(0, 0, W, H);

    // 兩道舞台燈，和產品視覺同一組光源
    const lamp = (x: number, y: number, r: number, color: string, a: number) => {
      const hex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color + hex(a));
      grad.addColorStop(1, color + "00");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
    };
    lamp(140, -40, 780, SODIUM, 0.22);
    lamp(1040, 300, 620, WASH, 0.13);

    // 字標
    g.fillStyle = BONE;
    g.font = `700 54px "Noto Serif TC", serif`;
    g.textBaseline = "alphabetic";
    g.fillText("安可", 96, 168);
    const mw = g.measureText("安可").width;
    roundRect(g, 96 + mw + 20, 128, 50, 50, 14);
    g.fillStyle = SODIUM;
    g.fill();
    g.fillStyle = "#15110a";
    g.font = `800 24px Archivo, sans-serif`;
    g.fillText("+1", 96 + mw + 31, 161);

    // 主文案
    g.fillStyle = SODIUM;
    g.font = `700 36px "Noto Sans TC", sans-serif`;
    g.fillText("今天開演", 96, 470);

    g.fillStyle = BONE;
    g.font = `700 108px "Noto Serif TC", serif`;
    wrap(g, name, 96, 596, W - 192, 128, 2);

    g.fillStyle = BONE;
    g.font = `700 64px "Noto Sans TC", sans-serif`;
    g.fillText(when || "今晚", 96, 846);

    if (where) {
      g.fillStyle = DIM;
      g.font = `500 42px "Noto Sans TC", sans-serif`;
      wrap(g, where, 96, 922, W - 192, 56, 2);
    }

    // QR 卡
    const qs = 560, qx = (W - qs) / 2, qy = 1090;
    g.fillStyle = "#ffffff";
    roundRect(g, qx - 36, qy - 36, qs + 72, qs + 72 + 96, 40);
    g.fill();
    if (qr.current) g.drawImage(qr.current, qx, qy, qs, qs);
    g.fillStyle = "#15110a";
    g.font = `700 40px "Noto Sans TC", sans-serif`;
    center(g, "掃碼點歌", W / 2, qy + qs + 56);

    // 底部說明
    g.fillStyle = DIM;
    g.font = `400 36px "Noto Sans TC", sans-serif`;
    wrap(g, note, 96, 1836, W - 192, 52, 2, "center");
  }

  function download() {
    const c = ref.current;
    if (!c) return;
    c.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `${slug}-開演公告.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 lg:max-w-[360px]">
        <label className="field">
          <span>時間</span>
          <input className="input" value={when} onChange={(e) => setWhen(e.target.value.slice(0, 24))} placeholder="今晚 20:00" />
        </label>
        <label className="field">
          <span>地點</span>
          <input className="input" value={where} onChange={(e) => setWhere(e.target.value.slice(0, 40))} placeholder="駁二大勇倉庫 C5 前" />
        </label>
        <label className="field">
          <span>下面那一行</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value.slice(0, 40))} />
        </label>
        <button onClick={download} disabled={!ready} className="btn btn-now">下載圖片</button>
        <p className="small">1080×1920，IG 限動與 FB 限時動態的尺寸。下載後直接上傳就好。</p>
      </div>

      <div className="mx-auto w-[280px] shrink-0 overflow-hidden rounded-[20px] border-2 border-ink">
        <canvas ref={ref} width={W} height={H} className="block w-full" />
      </div>
    </div>
  );
}

/* ── canvas 小工具 ── */

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function center(g: CanvasRenderingContext2D, text: string, cx: number, y: number) {
  g.fillText(text, cx - g.measureText(text).width / 2, y);
}

/** 中文沒有空白可以斷，所以一個字一個字量 */
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, maxLines: number, align: "left" | "center" = "left") {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (g.measureText(line + ch).width > max && line) { lines.push(line); line = ch; }
    else line += ch;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((l, i) => {
    const w = g.measureText(l).width;
    g.fillText(l, align === "center" ? x + (max - w) / 2 : x, y + i * lh);
  });
}
