"use client";

import Link from "next/link";

/** 付費版位的連結：點擊時回報一次，不擋住導頁 */
export function PromoLink({ promoId, href, className, children }: { promoId: string | null; href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (promoId) navigator.sendBeacon?.("/api/promo/click", promoId);
      }}
    >
      {children}
    </Link>
  );
}
