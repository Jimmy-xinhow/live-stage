import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { StageFooter, StageHeader } from "@/components/market/Shell";

/**
 * 法務頁共用版型。
 *
 * 三份文件（服務條款、隱私權、退款與爭議）互為前提，所以彼此要看得到，
 * 頂部一排切換不是裝飾——使用者在爭議當下通常不知道該查哪一份。
 */
const DOCS = [
  { href: "/terms", label: "服務條款" },
  { href: "/privacy", label: "隱私權政策" },
  { href: "/refund", label: "退款與爭議" },
];

export function LegalPage({
  title, updated, intro, here, children,
}: {
  title: string;
  updated: string;
  intro: string;
  here: string;
  children: React.ReactNode;
}) {
  return (
    <div className="stage min-h-screen">
      <StageHeader />
      <main id="main" className="mx-auto max-w-[760px] px-5 pt-12 pb-20">
        <nav aria-label="法務文件" className="flex flex-wrap gap-2">
          {DOCS.map((d) => {
            const on = d.href === here;
            return (
              <Link
                key={d.href}
                href={d.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-[8px] border px-4 text-[15px] transition-colors ${
                  on
                    ? "border-[color:var(--sodium)] text-[color:var(--sodium)]"
                    : "border-[color:var(--line)] text-[color:var(--dim)] hover:text-[color:var(--bone)]"
                }`}
              >
                {d.label}
              </Link>
            );
          })}
        </nav>

        <h1 className="d2 mt-9">{title}</h1>
        <p className="cap mt-3 text-[color:var(--dim)]">最後更新 {updated}　適用於 {BRAND.legal} 經營的「{BRAND.name}」服務</p>
        <p className="lede mt-6">{intro}</p>

        <div className="mt-10 space-y-9">{children}</div>

        <p className="cap mt-14 text-[color:var(--dim)]">
          對這份文件有疑問，或要行使你的資料權利，寄信到 {BRAND.legal} 的客服信箱，我們會在七個工作日內回覆。
        </p>
      </main>
      <StageFooter />
    </div>
  );
}

/** 一條條款。n 是編號，給爭議時引用用的——沒有編號的條款等於不能被引用 */
export function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[color:var(--line)] pt-7">
      <h2 className="t2 flex gap-3">
        <span className="font-num text-[color:var(--sodium)]">{n}</span>
        <span>{title}</span>
      </h2>
      <div className="mt-4 space-y-3 [&_li]:leading-7 [&_p]:leading-7 [&_strong]:text-[color:var(--bone)]">{children}</div>
    </section>
  );
}

/** 條款裡的要點列。法務文件的列點要能被逐項引用，所以保留圓點不用圖示 */
export function Points({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((t, i) => (
        <li key={i} className="list-disc">{t}</li>
      ))}
    </ul>
  );
}
