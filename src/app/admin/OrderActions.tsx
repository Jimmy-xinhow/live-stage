"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 平台端退款：只標記與退回服務費，實際款項由表演者退給觀眾 */
export function OrderActions({ id, performer, amount, status }: { id: string; performer: string; amount: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (status !== "paid") return null;
  return (
    <button
      disabled={busy}
      className="btn btn-quiet btn-sm"
      onClick={async () => {
        const note = prompt(`要把「${performer}」這筆 NT$${amount} 標記為退款嗎？\n平台不經手款項，實際退款要由表演者自己處理。\n\n（可填原因，直接按確定也可以）`, "");
        if (note === null) return;
        setBusy(true);
        const r = await fetch(`/api/admin/orders/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refund", note }),
        });
        setBusy(false);
        if (!r.ok) { alert("退款失敗，請重試。"); return; }
        const j = await r.json().catch(() => ({}));
        if (j.needsGatewayRefund) alert("已標記退款並退回服務費。這筆是刷卡訂單，記得到金流後台辦理退刷。");
        router.refresh();
      }}
    >
      退款
    </button>
  );
}
