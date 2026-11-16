"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Pin } from "@/lib/map";
import { fmtTaipei } from "@/lib/format";
import { AREAS } from "@/lib/areas";

/** Leaflet 從 CDN 載入，只用到這幾個方法 */
type LeafletMap = { setView: (c: [number, number], z: number) => LeafletMap };
type LeafletMarker = { addTo: (m: LeafletMap) => LeafletMarker; on: (ev: string, fn: () => void) => LeafletMarker };
type Leaflet = {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown };
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (c: [number, number], opts?: Record<string, unknown>) => LeafletMarker;
};
declare global { interface Window { L?: Leaflet } }

/** OpenStreetMap＋Leaflet（CDN 載入，沒載到就只顯示清單） */
export function MapView({ pins, center }: { pins: Pin[]; center: { lat: number; lng: number; zoom: number } }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    async function load() {
      if (!window.L) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          s.onload = () => res();
          s.onerror = () => rej(new Error("leaflet"));
          document.head.appendChild(s);
        });
      }
      if (dead || !box.current || !window.L) return;
      const L = window.L;
      const map = L.map(box.current, { scrollWheelZoom: false, attributionControl: true }).setView([center.lat, center.lng], center.zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
      for (const p of pins) {
        const icon = L.divIcon({
          className: "",
          html: `<span style="display:flex;align-items:center;gap:6px;white-space:nowrap;transform:translate(-10px,-50%);">
            <span style="width:14px;height:14px;border-radius:999px;border:2px solid #151412;background:${p.kind === "live" ? "#FF4F1F" : "#FBFAF6"}"></span>
            <span style="background:#151412;color:#F4F1EA;font-size:12px;line-height:1;padding:4px 6px;border-radius:6px;">${p.title.replace(/</g, "")}</span>
          </span>`,
          iconSize: [0, 0],
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .on("click", () => setActive(p.kind + p.id));
      }
      setReady(true);
    }
    load().catch(() => setFailed(true));
    return () => { dead = true; };
  }, [pins, center]);

  return (
    <div className="mt-5 flex flex-col gap-5 md:flex-row">
      <div className="md:flex-1">
        {!failed && <div ref={box} className="h-[420px] overflow-hidden rounded-[20px] border-[1.5px] border-ink bg-sunken md:h-[560px]" />}
        {!ready && !failed && <p className="small mt-2">地圖載入中。</p>}
        {failed && (
          <>
            <Schematic pins={pins} active={active} onPick={setActive} />
            <p className="small mt-2">線上地圖載不出來（可能是網路限制），改用簡易位置圖：點位依實際經緯度排列，只是沒有街道底圖。</p>
          </>
        )}
      </div>
      <div className="md:w-[360px]">
        <h2 className="h3">清單</h2>
        <div className="mt-1 border-t-2 border-ink">
          {pins.length ? pins.map((p) => (
            <Link
              key={p.kind + p.id}
              href={p.href}
              className={`row flex min-h-[64px] items-center gap-3 py-3 ${active === p.kind + p.id ? "bg-raised" : ""}`}
            >
              <span className={`mt-1 h-3 w-3 shrink-0 self-start rounded-full border-[1.5px] border-ink ${p.kind === "live" ? "bg-now" : "bg-raised"}`} />
              <span className="min-w-0 flex-1">
                <strong className="block truncate">{p.title}</strong>
                <span className="small block truncate">{p.sub}</span>
                <span className="small block">{p.kind === "live" ? "正在演出" : fmtTaipei(p.when)}・{p.city}{p.approx ? "（約略位置）" : ""}</span>
              </span>
            </Link>
          )) : <p className="small py-4">這個地區現在沒有演出或近期活動。</p>}
        </div>
      </div>
    </div>
  );
}

/** 載不到線上地圖時的備案：依經緯度排出的簡易位置圖，不需要外部資源 */
function Schematic({ pins, active, onPick }: { pins: Pin[]; active: string | null; onPick: (k: string) => void }) {
  const W = 680;
  const H = 560;
  const lats = [21.8, 26.35];
  const lngs = [118.05, 122.15];
  const x = (lng: number) => ((lng - lngs[0]) / (lngs[1] - lngs[0])) * (W - 80) + 40;
  const y = (lat: number) => H - 40 - ((lat - lats[0]) / (lats[1] - lats[0])) * (H - 80);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[420px] w-full rounded-[20px] border-[1.5px] border-ink bg-sunken md:h-[560px]" role="img" aria-label="簡易位置圖">
      {AREAS.map((a) => (
        <text key={a.slug} x={x(a.lng)} y={y(a.lat)} fontSize="11" fill="#6B665C" textAnchor="middle">{a.short}</text>
      ))}
      {pins.map((p) => {
        const on = active === p.kind + p.id;
        return (
          <g key={p.kind + p.id} onClick={() => onPick(p.kind + p.id)} style={{ cursor: "pointer" }}>
            <circle cx={x(p.lng)} cy={y(p.lat) - 10} r={on ? 8 : 6} fill={p.kind === "live" ? "#FF4F1F" : "#FBFAF6"} stroke="#151412" strokeWidth="2" />
            {on && <text x={x(p.lng) + 12} y={y(p.lat) - 6} fontSize="12" fill="#151412" fontWeight="700">{p.title}</text>}
          </g>
        );
      })}
    </svg>
  );
}
