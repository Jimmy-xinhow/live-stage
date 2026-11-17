import Link from "next/link";
import { nt } from "@/lib/format";
import { fmtTaipei } from "@/lib/format";

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col py-4">
      <span className="label">{label}</span>
      <strong className="num text-[22px] leading-8 md:text-[26px] md:leading-9">{typeof value === "number" ? value.toLocaleString("zh-TW") : value}</strong>
      {sub && <span className="small">{sub}</span>}
    </div>
  );
}

export function Stats({ items }: { items: { label: string; value: string | number; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 border-y border-rule md:grid-cols-4">
      {items.map((s, i) => (
        <div key={s.label} className={i % 2 ? "border-l border-rule pl-5 md:border-l md:pl-5" : "md:border-l md:border-rule md:pl-5 first:md:border-l-0 first:md:pl-0"}>
          <Stat {...s} />
        </div>
      ))}
    </div>
  );
}

/** 表格：手機橫向捲動，right 指定的欄位靠右（數字欄用） */
export function Table({ head, rows, right = [], empty = "沒有資料" }: { head: string[]; rows: React.ReactNode[][]; right?: number[]; empty?: string }) {
  if (!rows.length) return <p className="small py-6">{empty}</p>;
  const r = new Set(right);
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[720px] border-collapse text-[14px]">
        <thead>
          <tr className="border-y-2 border-ink">
            {head.map((h, j) => <th key={h || j} className={`label whitespace-nowrap px-3 py-2.5 font-medium first:pl-0 last:pr-0 ${r.has(j) ? "text-right" : "text-left"}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-rule align-middle">
              {row.map((c, j) => <td key={j} className={`whitespace-nowrap px-3 py-3 first:pl-0 last:pr-0 ${r.has(j) ? "text-right" : ""}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 表格裡的頭像＋名稱 */
export function Who({ src, name, href, tag }: { src?: string | null; name: string; href?: string; tag?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-[12px] font-bold text-ink3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1)}
      </span>
      {href ? <Out href={href}>{name}</Out> : <span className="font-medium">{name}</span>}
      {tag}
    </span>
  );
}

export const Money = ({ v }: { v: number }) => <span className="num">{nt(v)}</span>;
export const Pts = ({ v }: { v: number }) => <span className="num">{v.toLocaleString("zh-TW", { maximumFractionDigits: 2 })} 點</span>;
export const When = ({ v, full = false }: { v: string; full?: boolean }) => <span className="small num whitespace-nowrap">{fmtTaipei(v, true, full)}</span>;
export const Tag = ({ on, children }: { on?: boolean; children: React.ReactNode }) => <span className={`tag ${on ? "tag-now" : "tag-quiet"}`}>{children}</span>;
/** 交易／審核狀態：ok 綠、warn 橘、bad 紅、其他灰 */
export const State = ({ kind, children }: { kind: "ok" | "warn" | "bad" | "idle"; children: React.ReactNode }) => (
  <span className={`tag tag-quiet ${kind === "ok" ? "!text-ok" : kind === "warn" ? "!text-nowtext" : kind === "bad" ? "!text-err" : ""}`}>{children}</span>
);
/** 長代號：只顯示後 10 碼，滑過看全文 */
export const Code = ({ v }: { v: string }) => <span className="num text-[12px] text-ink3" title={v}>…{v.slice(-10)}</span>;
export const Out = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} target="_blank" className="font-medium underline">{children}</Link>;
