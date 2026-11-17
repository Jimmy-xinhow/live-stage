"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavGroup = { label: string; items: { href: string; label: string; badge?: number }[] };

/** 桌機是側欄分組選單，手機收在一個下拉裡，避免一長排捲不完 */
export function BackNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const all = groups.flatMap((g) => g.items);
  const current = all.filter((i) => (i.href.split("/").length <= 2 ? path === i.href : path.startsWith(i.href))).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="no-print mx-5 mb-4 flex h-11 w-[calc(100%-40px)] items-center justify-between rounded-[12px] border-[1.5px] border-ink px-4 text-[15px] font-bold md:hidden">
        {current?.label ?? "選單"}
        <span className="small">{open ? "收起" : "切換"}</span>
      </button>
      <nav aria-label="後台選單" className={`no-print px-5 pb-4 md:block md:px-3 ${open ? "block" : "hidden"}`}>
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <span className="label block px-3 pb-1.5">{g.label}</span>
            {g.items.map((i) => {
              const on = current?.href === i.href;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-[40px] items-center gap-2 rounded-[10px] px-3 text-[15px] ${on ? "bg-ink font-bold text-paper" : "font-medium text-ink2 hover:bg-sunken"}`}
                >
                  <span className="flex-1 truncate">{i.label}</span>
                  {!!i.badge && <span className={`num flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] font-bold ${on ? "bg-paper text-ink" : "bg-now text-ink"}`}>{i.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}
