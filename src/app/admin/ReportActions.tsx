"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const send = async (status: "reviewed" | "dismissed") => {
    setBusy(true);
    await fetch("/api/admin/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setBusy(false);
    router.refresh();
  };
  return (
    <span className="flex gap-2 whitespace-nowrap">
      <button disabled={busy} onClick={() => send("reviewed")} className="btn btn-quiet btn-sm">已處理</button>
      <button disabled={busy} onClick={() => send("dismissed")} className="btn btn-quiet btn-sm">不成立</button>
    </span>
  );
}
