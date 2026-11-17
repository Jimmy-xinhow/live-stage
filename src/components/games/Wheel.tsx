"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 真正會轉的轉盤。
 *
 * 伺服器只決定「轉到哪一格」（resultId）與「什麼時候按下去」（spunAt）；
 * 轉幾圈、怎麼減速是畫面的事。這樣每台大螢幕、每支手機看到的結果一定一致，
 * 但動畫不必跟伺服器對時。
 *
 * 角度算法：第 i 格的中心在順時針 (i+0.5)*(360/N) 度。要把它轉到十二點鐘方向的
 * 指針底下，整個盤要轉 (360 - 中心角) 度，再加上幾圈讓它看起來像真的在轉。
 */
const SEG = ["#ffb03a", "#e8356d", "#5fd0e3", "#f2efe9", "#ff4f1f", "#8b7bd8"];
const INK = ["#15110a", "#1a0a10", "#06171b", "#151412", "#1d0a04", "#120b22"];

export function Wheel({
  entries,
  resultId,
  spunAt,
  size = 54,
}: {
  entries: { id: string; text: string; name: string }[];
  resultId: string | null;
  spunAt: number;
  /** 直徑，單位 vh（大螢幕）或 vw（手機）由外層決定 */
  size?: number;
}) {
  const n = Math.max(entries.length, 1);
  const idx = resultId ? entries.findIndex((e) => e.id === resultId) : -1;
  const [deg, setDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const lastSpin = useRef(0);

  useEffect(() => {
    if (!spunAt || spunAt === lastSpin.current || idx < 0) return;
    lastSpin.current = spunAt;
    const center = (idx + 0.5) * (360 / n);
    // 從目前角度往前推到下一個落點，至少再轉 6 圈，絕不倒退
    const target = Math.ceil((deg + 360 * 6) / 360) * 360 + (360 - center);
    // 晚進來的人（例如剛打開手機）不該再看一次轉的過程，直接給結果
    if (Date.now() - spunAt > 10_000) {
      setSpinning(false);
      setDeg(360 - center);
      return;
    }
    setSpinning(true);
    setDeg(target);
    const t = setTimeout(() => setSpinning(false), 5600);
    return () => clearTimeout(t);
  }, [spunAt, idx, n, deg]);

  const r = 100;
  const arc = 360 / n;

  return (
    <div className="relative" style={{ width: `${size}vh`, height: `${size}vh` }}>
      {/* 指針。固定在十二點鐘，盤轉它不轉 */}
      <svg viewBox="0 0 40 40" className="absolute left-1/2 -top-[1.4vh] z-20 -translate-x-1/2" style={{ width: `${size * 0.13}vh` }} aria-hidden>
        <path d="M20 34 L6 6 Q20 13 34 6 Z" fill="#f2efe9" stroke="#0d1117" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>

      <div
        className="h-full w-full"
        style={{
          transform: `rotate(${deg}deg)`,
          transition: spinning ? "transform 5.4s cubic-bezier(.12,.72,.14,1)" : "none",
        }}
      >
        <svg viewBox="-110 -110 220 220" className="h-full w-full drop-shadow-[0_0_3vh_rgba(255,176,58,.35)]">
          {entries.length === 0 && <circle r={r} fill="#1c242f" stroke="#2b3542" strokeWidth="3" />}
          {entries.map((e, i) => {
            const a0 = (i * arc - 90) * (Math.PI / 180);
            const a1 = ((i + 1) * arc - 90) * (Math.PI / 180);
            const big = arc > 180 ? 1 : 0;
            const d = n === 1
              ? `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 Z`
              : `M 0 0 L ${r * Math.cos(a0)} ${r * Math.sin(a0)} A ${r} ${r} 0 ${big} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
            // 中文沿著半徑排會變成直的，很難讀。改成在扇形重心放水平文字，
            // 太長就折成兩行。盤上項目本來就限制 40 字以內，這樣夠用。
            const midDeg = (i + 0.5) * arc - 90;
            const midRad = midDeg * (Math.PI / 180);
            const rr = n <= 2 ? r * 0.5 : n <= 4 ? r * 0.58 : r * 0.62;
            const cx = rr * Math.cos(midRad);
            const cy = rr * Math.sin(midRad);
            const per = n <= 4 ? 7 : n <= 6 ? 6 : 5;
            const words = e.text.length > per ? [e.text.slice(0, per), e.text.slice(per, per * 2)] : [e.text];
            const fs = n <= 4 ? 11 : n <= 6 ? 9.5 : n <= 9 ? 8 : 6.6;
            return (
              <g key={e.id}>
                <path d={d} fill={SEG[i % SEG.length]} stroke="#0d1117" strokeWidth="1.4" />
                {/* 先移到扇形重心，再用同一條時間曲線反向轉回來，字就不會跟著盤倒過來 */}
                <g transform={`translate(${cx} ${cy})`}>
                  <g style={{ transform: `rotate(${-deg}deg)`, transition: spinning ? "transform 5.4s cubic-bezier(.12,.72,.14,1)" : "none" }}>
                    <text x={0} y={0} textAnchor="middle" fill={INK[i % INK.length]} fontSize={fs} fontWeight={800}>
                      {words.map((w, k) => (
                        <tspan key={k} x={0} dy={k === 0 ? (words.length > 1 ? -fs * 0.15 : fs * 0.35) : fs * 1.1}>{w}</tspan>
                      ))}
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
          <circle r={r} fill="none" stroke="#0d1117" strokeWidth="4" />
          <circle r={r * 0.17} fill="#0d1117" stroke="#f2efe9" strokeWidth="2.5" />
        </svg>
      </div>
    </div>
  );
}
