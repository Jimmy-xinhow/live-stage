"use client";

import { useState } from "react";

const REASONS = [
  ["abuse", "謾罵或人身攻擊"],
  ["sexual", "色情或不雅內容"],
  ["spam", "洗版或廣告"],
  ["fake", "不實資訊"],
  ["other", "其他"],
] as const;

/** 檢舉不當內容。送出後平台後台會看到，不會直接下架 */
export function ReportButton({ targetType, targetId, label = "檢舉" }: {
  targetType: "order" | "performer" | "event" | "chat";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) return <span className="small !text-[12px] text-ink3">已送出檢舉</span>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="small !text-[12px] text-ink3 underline">
        {label}
      </button>
    );
  }
  return (
    <div className="mt-1.5 rounded-[12px] bg-sunken p-3">
      <p className="small mb-2">這則內容有什麼問題？送出後平台會查看。</p>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            disabled={busy}
            className="tag tag-quiet !h-8"
            onClick={async () => {
              setBusy(true);
              await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetType, targetId, reason: v }),
              }).catch(() => {});
              setBusy(false);
              setDone(true);
            }}
          >
            {l}
          </button>
        ))}
        <button type="button" onClick={() => setOpen(false)} className="small underline">取消</button>
      </div>
    </div>
  );
}
