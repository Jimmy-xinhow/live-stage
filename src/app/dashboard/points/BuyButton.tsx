"use client";

import { useState } from "react";
import { submitForm } from "@/lib/formpost";

export function BuyButton({ packageId }: { packageId: string }) {
  const [busy, setBusy] = useState(false);
  const buy = async () => {
    setBusy(true);
    const r = await fetch("/api/dashboard/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packageId }) });
    const j = await r.json();
    if (!r.ok) { alert(j.error); setBusy(false); return; }
    if (j.redirect) location.href = j.redirect;
    else submitForm(j.action, j.fields);
  };
  return <button disabled={busy} onClick={buy} className="btn btn-primary btn-sm btn-block mt-4">{busy ? "前往付款" : "購買"}</button>;
}
