"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({ inquiryId, performerId, hidden }: { inquiryId: string; performerId: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inquiryId, performerId, hidden: !hidden }) });
        setBusy(false);
        router.refresh();
      }}
      className="btn btn-quiet btn-sm"
    >
      {hidden ? "恢復顯示" : "隱藏"}
    </button>
  );
}
