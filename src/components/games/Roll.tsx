"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 會滾上去的數字。
 *
 * 直接跳號看不出發生了什麼事；滾動讓人知道「剛剛增加了」，
 * 而且滾完停住的那一刻比靜止的數字更有份量。這是記分板的基本功。
 */
export function Roll({ value, className = "", ms = 650 }: { value: number; className?: string; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.current === value) { from.current = value; setShown(value); return; }
    const a = from.current, b = value, t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      // 先快後慢，停得住
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (b - a) * e));
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, ms]);

  return <span className={className}>{shown.toLocaleString()}</span>;
}
