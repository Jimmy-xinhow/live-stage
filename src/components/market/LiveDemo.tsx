"use client";

import { useEffect, useState } from "react";

const SONGS = [
 { t: "晴天", s: "周杰倫", p: 100 },
 { t: "小幸運", s: "田馥甄", p: 100 },
 { t: "家後", s: "江蕙", p: 150 },
];

/**
 * 首頁唯一的動態：把整條流程演一次。
 * 聽眾點一首 → 進排隊 → 上大螢幕。這是這個產品最難用文字講清楚的部分，
 * 所以用一段會自己跑完的示範代替描述。其餘頁面不做進場動畫。
 */
export function LiveDemo() {
 const [step, setStep] = useState(0);

 useEffect(() => {
 if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
 setStep(3);
 return;
 }
 const waits = [1400, 1100, 1500, 2600];
 const t = setTimeout(() => setStep((s) => (s + 1) % 4), waits[step]);
 return () => clearTimeout(t);
 }, [step]);

 const picked = step >= 1;
 const queued = step >= 2;
 const onScreen = step >= 3;

 return (
 <div className="relative mx-auto flex w-[320px] flex-col gap-4 md:w-[516px] md:flex-row md:items-start md:gap-5" aria-label="示範：聽眾點歌後，歌進入排隊並顯示在大螢幕上">
 {/* 表演者的大螢幕：墊在右後方 */}
 <div className="pane glow-screen order-1 w-full overflow-hidden p-5 md:order-2 md:mt-10 md:w-[300px]">
 <div className="flex items-center justify-between">
 <span className="flex items-center gap-2 cap font-bold text-[color:var(--dim)]"><i className="livedot" />大螢幕</span>
 <span className="cap text-[color:var(--dim)]">排隊 {queued ? 3 : 2}</span>
 </div>
 <div className="mt-4 min-h-[92px]">
 <span className="cap text-[color:var(--dim)]">{onScreen ? "正在唱" : "下一首"}</span>
 <strong
 className={`mt-1 block d3 leading-tight font-black tracking-tight transition-all duration-700 md:d2 ${
 onScreen ? "translate-y-0 text-[color:var(--sodium)] opacity-100" : "translate-y-1 opacity-45"
 }`}
 >
 {onScreen ? "晴天" : "家後"}
 </strong>
 <span className={`mt-1 block cap transition-opacity duration-700 ${onScreen ? "opacity-100" : "opacity-0"}`}>
 Kevin 點播・「下班路上想聽這首」
 </span>
 </div>
 <div className="mt-4 flex gap-1.5" aria-hidden>
 {[0, 1, 2, 3].map((i) => (
 <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-[color:var(--sodium)]" : "bg-[color:var(--line)]"}`} />
 ))}
 </div>
 </div>

 {/* 聽眾的手機：疊在左前方 */}
 <div className="glow-phone order-2 mx-auto w-[188px] shrink-0 overflow-hidden bg-paper text-ink md:order-1 md:mx-0 md:w-[196px]">
 <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
 <span className="cap font-bold">阿哲的街頭吉他</span>
 <span className="flex items-center gap-1.5 cap text-nowtext"><i className="livedot inline-block" />演出中</span>
 </div>
 <div className="px-2.5 pb-3">
 {SONGS.map((song, i) => {
 const active = i === 0 && picked;
 return (
 <div
 key={song.t}
 className={`mb-1.5 flex items-center justify-between gap-2 rounded-[8px] border-[1.5px] px-2.5 py-2 transition-all duration-500 ${
 active ? "border-ink bg-ink text-paper" : "border-rule bg-raised"
 }`}
 >
 <span className="min-w-0">
 <span className="block truncate cap font-bold">{song.t}</span>
 <span className={`block truncate cap ${active ? "text-paper/70" : "text-ink3"}`}>{song.s}</span>
 </span>
 <span className={`shrink-0 rounded-[8px] px-1.5 py-1 cap font-bold ${active ? "bg-now text-ink" : "border-[1.5px] border-ink"}`}>
 {active ? "已付款" : `NT$${song.p}`}
 </span>
 </div>
 );
 })}
 </div>
 </div>

 {/* 飛進排隊的那一首 */}
 <div
 aria-hidden
 className={`pointer-events-none absolute top-[150px] left-[120px] z-30 rounded-[8px] bg-[color:var(--sodium)] px-2.5 py-1.5 cap font-bold text-[#1a1205] shadow-[0_8px_24px_-6px_rgba(255,176,58,.9)] transition-all duration-[900ms] ease-[cubic-bezier(.3,.9,.3,1)] ${
 queued ? "translate-x-14 -translate-y-24 opacity-0" : "translate-x-0 translate-y-0"
 } ${picked && !onScreen ? "opacity-100" : "opacity-0"}`}
 >
 晴天 ＋NT$100
 </div>

 <p className="absolute -bottom-7 left-0 cap text-[color:var(--dim)]">
 {["聽眾打開你的點歌頁", "挑一首、付款", "歌進到你的排隊清單", "大螢幕亮出歌名和點歌的人"][step]}
 </p>
 </div>
 );
}
