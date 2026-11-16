"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EventActions({ id, title, status }: { id: string; title: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (next: "published" | "cancelled") => {
    setBusy(true);
    await fetch(`/api/admin/events/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    setBusy(false);
    router.refresh();
  };
  return status === "published" ? (
    <button disabled={busy} onClick={() => confirm(`下架「${title}」？`) && act("cancelled")} className="btn btn-quiet btn-sm">下架</button>
  ) : (
    <button disabled={busy} onClick={() => act("published")} className="btn btn-quiet btn-sm">恢復</button>
  );
}
