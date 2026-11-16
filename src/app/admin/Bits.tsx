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

/** 表格：手機橫向捲動，數字欄靠右 */
export function Table({ head, rows, empty = "沒有資料" }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="small py-6">{empty}</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[720px] border-collapse text-[14px]">
        <thead>
          <tr className="border-y-2 border-ink">
            {head.map((h) => <th key={h} className="label py-2.5 text-left font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-rule align-middle">
              {r.map((c, j) => <td key={j} className="py-2.5 pr-4">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Money = ({ v }: { v: number }) => <span className="num">{nt(v)}</span>;
export const Pts = ({ v }: { v: number }) => <span className="num">{v.toLocaleString("zh-TW", { maximumFractionDigits: 2 })} 點</span>;
export const When = ({ v }: { v: string }) => <span className="small num whitespace-nowrap">{fmtTaipei(v)}</span>;
export const Tag = ({ on, children }: { on?: boolean; children: React.ReactNode }) => <span className={`tag ${on ? "tag-now" : "tag-quiet"}`}>{children}</span>;
export const Out = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} target="_blank" className="font-medium underline">{children}</Link>;
