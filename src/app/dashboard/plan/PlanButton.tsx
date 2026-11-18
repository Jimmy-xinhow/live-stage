"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanSlug } from "@/lib/plans";

export function PlanButton({ to, label, kind = "secondary" }: { to: PlanSlug; label: string; kind?: "now" | "secondary" | "quiet" }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr("");
    const res = await fetch("/api/dashboard/plan", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: to }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "改不了，稍後再試"); return; }
    r.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={go} disabled={busy} className={`btn btn-${kind} w-full`}>
        {busy ? "處理中…" : label}
      </button>
      {err && <p className="small text-err">{err}</p>}
    </div>
  );
}
