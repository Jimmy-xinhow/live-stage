"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Pin } from "@/lib/map";
import { fmtTaipei } from "@/lib/format";
import { AREAS } from "@/lib/areas";

/** Leaflet 從 CDN 載入，只用到這幾個方法 */
type LeafletMap = { setView: (c: [number, number], z: number) => LeafletMap; removeLayer: (l: unknown) => void };
type LeafletMarker = { addTo: (m: LeafletMap) => LeafletMarker; on: (ev: string, fn: () => void) => LeafletMarker };
type LeafletCircle = { addTo: (m: LeafletMap) => LeafletCircle };
type Leaflet = {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (m: LeafletMap) => unknown };
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (c: [number, number], opts?: Record<string, unknown>) => LeafletMarker;
  circle: (c: [number, number], opts?: Record<string, unknown>) => LeafletCircle;
};
declare global { interface Window { L?: Leaflet } }

type Here = { lat: number; lng: number; acc: number };
type GpsState = "idle" | "asking" | "ok" | "denied" | "unavailable";

/** 兩點直線距離（公尺）。Haversine，台灣範圍內誤差可忽略 */
function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fmtDistance(m: number) {
  if (m < 950) return `${Math.max(10, Math.round(m / 10) * 10)} 公尺`;
  return `${(m / 1000).toFixed(m < 9500 ? 1 : 0)} 公里`;
}

/** OpenStreetMap＋Leaflet（CDN 載入，沒載到就只顯示清單） */
export function MapView({ pins, center }: { pins: Pin[]; center: { lat: number; lng: number; zoom: number } }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const hereLayers = useRef<unknown[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [here, setHere] = useState<Here | null>(null);
  const [gps, setGps] = useState<GpsState>("idle");
  const [onlyLive, setOnlyLive] = useState(false);

  // 依距離排序；沒有定位就維持伺服器端的順序（演出中優先、再依時間）
  const list = useMemo(() => {
    const base = onlyLive ? pins.filter((p) => p.kind === "live") : pins;
    if (!here) return base.map((p) => ({ p, d: null as number | null }));
    return base
      .map((p) => ({ p, d: metersBetween(here, p) }))
      .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
  }, [pins, here, onlyLive]);

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
      mapRef.current = map;
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
    return () => { dead = true; mapRef.current = null; };
  }, [pins, center]);

  // 取得定位後，在地圖上畫出「你在這裡」並把視角移過去
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !here) return;
    for (const l of hereLayers.current) map.removeLayer(l);
    hereLayers.current = [];
    const dot = L.divIcon({
      className: "",
      html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:#151412;border:3px solid #F4F1EA;box-shadow:0 0 0 2px #151412;transform:translate(-9px,-9px);"></span>`,
      iconSize: [0, 0],
    });
    hereLayers.current.push(L.marker([here.lat, here.lng], { icon: dot }).addTo(map));
    if (here.acc > 60) {
      hereLayers.current.push(
        L.circle([here.lat, here.lng], { radius: here.acc, color: "#151412", weight: 1, fillColor: "#151412", fillOpacity: 0.06 }).addTo(map),
      );
    }
    map.setView([here.lat, here.lng], here.acc > 2000 ? 12 : 14);
  }, [here, ready]);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return setGps("unavailable");
    setGps("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy || 0 });
        setGps("ok");
      },
      () => setGps("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const liveCount = pins.filter((p) => p.kind === "live").length;

  return (
    <div className="mt-4 flex flex-col gap-5 md:flex-row">
      <div className="md:flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={locate} className="btn btn-secondary btn-sm" disabled={gps === "asking"}>
            {gps === "asking" ? "定位中…" : here ? "重新定位" : "用我的位置找附近"}
          </button>
          {liveCount > 0 && (
            <button type="button" onClick={() => setOnlyLive((v) => !v)} className={`tag !h-9 !px-3 !text-[14px] ${onlyLive ? "!bg-ink !text-paper" : "tag-quiet"}`}>
              只看演出中（{liveCount}）
            </button>
          )}
          {here && <span className="small">已依離你的距離排序{here.acc > 500 ? `（定位誤差約 ${fmtDistance(here.acc)}）` : ""}</span>}
          {gps === "denied" && <span className="small">沒有拿到定位，可以在瀏覽器網址列的鎖頭圖示開啟位置權限，或直接選縣市。</span>}
          {gps === "unavailable" && <span className="small">這個瀏覽器不支援定位，請直接選縣市。</span>}
        </div>

        {!failed && <div ref={box} className="h-[420px] overflow-hidden rounded-[20px] border-[1.5px] border-ink bg-sunken md:h-[560px]" />}
        {!ready && !failed && <p className="small mt-2">地圖載入中。</p>}
        {failed && (
          <>
            <Schematic pins={onlyLive ? pins.filter((p) => p.kind === "live") : pins} active={active} onPick={setActive} here={here} />
            <p className="small mt-2">線上地圖載不出來（可能是網路限制），改用簡易位置圖：點位依實際經緯度排列，只是沒有街道底圖。</p>
          </>
        )}
      </div>

      <div className="md:w-[360px]">
        <h2 className="h3">{here ? "離你最近" : "清單"}</h2>
        <div className="mt-1 border-t-2 border-ink">
          {list.length ? list.map(({ p, d }) => (
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
              {d != null && <span className="small num shrink-0 self-start pt-0.5 font-semibold text-ink2">{fmtDistance(d)}</span>}
            </Link>
          )) : <p className="small py-4">{onlyLive ? "這個地區現在沒有人在演出。" : "這個地區現在沒有演出或近期活動。"}</p>}
        </div>
      </div>
    </div>
  );
}

/** 載不到線上地圖時的備案：依經緯度排出的簡易位置圖，不需要外部資源 */
function Schematic({ pins, active, onPick, here }: { pins: Pin[]; active: string | null; onPick: (k: string) => void; here: Here | null }) {
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
      {here && <circle cx={x(here.lng)} cy={y(here.lat) - 10} r={7} fill="#151412" stroke="#F4F1EA" strokeWidth="3" />}
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
