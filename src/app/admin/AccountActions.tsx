"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 調整點數、停用或恢復帳號 */
export function AccountActions({ id, name, status }: { id: string; name: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const send = async (body: object) => {
    setBusy(true);
    await fetch(`/api/admin/accounts/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    router.refresh();
  };
  return (
    <span className="flex gap-2 whitespace-nowrap">
      <button
        disabled={busy}
        onClick={() => {
          const v = prompt(`調整 ${name} 的點數（正數加、負數扣）`, "100");
          if (v && Number(v)) send({ adjustPoints: Math.round(Number(v)), note: "平台調整" });
        }}
        className="btn btn-quiet btn-sm"
      >
        調點數
      </button>
      <button
        disabled={busy}
        onClick={() => confirm(status === "active" ? `停用 ${name}？頁面會下架。` : `恢復 ${name}？`) && send({ status: status === "active" ? "suspended" : "active" })}
        className="btn btn-quiet btn-sm"
      >
        {status === "active" ? "停用" : "恢復"}
      </button>
    </span>
  );
}
