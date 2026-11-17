import { BRAND } from "@/lib/brand";

/**
 * 字標：「安可」加上一個 ＋1 記號。
 * ＋1 就是「再一首」，也是觀眾每一次動作對這場演出的貢獻。
 * 小尺寸時只留記號（favicon、App icon、大螢幕角落）。
 */
export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <g fill="var(--mark-ink, #15110a)">
        <rect x="6.4" y="14.3" width="9.6" height="3.4" rx="1.7" />
        <rect x="9.5" y="11.2" width="3.4" height="9.6" rx="1.7" />
        <path d="M19.2 11.4h3.2v9.2h2.6v2.6h-7.8v-2.6h2.6v-6l-2.2 1.1-1-2.4 2.6-1.9Z" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "", mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[20px] leading-none font-black tracking-[-0.04em]">{BRAND.name}</span>
      {mark && <Mark size={19} className="text-[color:var(--sodium,#ffb03a)]" />}
    </span>
  );
}
