"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashNav({ items }: { items: readonly (readonly [string, string])[] }) {
  const path = usePathname();
  return (
    <nav aria-label="後台選單" className="no-print -mx-5 mb-6 flex gap-1.5 overflow-x-auto border-b border-rule px-5 pb-3 md:mx-0 md:flex-wrap md:px-0">
      {items.map(([href, label]) => {
        const on = href === "/dashboard" || href === "/org" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`flex h-9 shrink-0 items-center rounded-[10px] px-3.5 text-[14px] ${on ? "bg-ink font-bold text-paper" : "font-medium text-ink2 hover:bg-sunken"}`}>{label}</Link>
        );
      })}
    </nav>
  );
}
