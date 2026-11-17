"use client";

import { useState } from "react";
import { PLANS, boughtForFeatures, breakEven } from "@/lib/plans";

const nt = (n: number) => `NT$${Math.round(n).toLocaleString()}`;

/** 自己算一次：這個月收多少，兩個方案各付多少 */
export function Calc() {
 const [gmv, setGmv] = useState(20000);
 const rows = PLANS.map((p) => ({ p, cost: Math.round(gmv * p.feeRate) + p.price }));
 // 只在「不買額外功能」的兩層之間比便宜；互動與全部是買功能，拿來比價會誤導
 const best = rows.filter((r) => !boughtForFeatures(r.p.slug)).reduce((a, b) => (b.cost < a.cost ? b : a));
 const be = breakEven();

 return (
 <div className="pane flex flex-col gap-5 p-6">
 <div>
 <label className="cap text-[color:var(--dim)]" htmlFor="gmv">你一個月大概收到多少點歌與打賞？</label>
 <div className="mt-3 flex items-baseline gap-2">
 <span className="num d2 font-black">{nt(gmv)}</span>
 </div>
 <input
 id="gmv"
 type="range"
 min={0}
 max={120000}
 step={1000}
 value={gmv}
 onChange={(e) => setGmv(Number(e.target.value))}
 className="mt-3 w-full accent-[#ffb03a]"
 />
 <div className="flex justify-between cap text-[color:var(--dim)]"><span>NT$0</span><span>NT$120,000</span></div>
 </div>

 <div className="border-t border-[color:var(--line)]">
 {rows.map(({ p, cost }) => (
 <div key={p.slug} className="flex items-baseline justify-between gap-4 border-b border-[color:var(--line)] py-3">
 <span>
 <strong>{p.name}</strong>
 <span className="ml-2 cap text-[color:var(--dim)]">
 {p.price > 0 ? `月費 ${nt(p.price)}＋` : ""}成交 {(p.feeRate * 100).toFixed(0)}%
 </span>
 </span>
 <span className="flex items-baseline gap-2">
 {boughtForFeatures(p.slug) && <span className="cap text-[color:var(--dim)]">買功能</span>}
 <span className={`num t2 font-bold ${best.p.slug === p.slug ? "text-[color:var(--sodium)]" : ""}`}>{nt(cost)}</span>
 </span>
 </div>
 ))}
 </div>

 <p className="leading-7">
 光看費用，一個月 {nt(gmv)} 的話<strong>{best.p.name}</strong>比較便宜，付 {nt(best.cost)}。
 分界點在 {nt(be)}，超過就換月費。
 </p>
 <p className="cap leading-6 text-[color:var(--dim)]">
 互動與全部這兩層的費率跟點歌台一樣，所以永遠不會在這裡算贏——要不要升級看的是你需不需要那些功能，不是量。
 </p>
 </div>
 );
}
