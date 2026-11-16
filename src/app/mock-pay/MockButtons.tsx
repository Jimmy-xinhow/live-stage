"use client";

import { useState } from "react";

export function MockButtons({ kind, tradeNo }: { kind: "order" | "points"; tradeNo: string }) {
  const [busy, setBusy] = useState(false);
  const go = async (result: "success" | "fail") => {
    setBusy(true);
    const j = await fetch("/api/mock-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ k: kind, t: tradeNo, result }) }).then((r) => r.json());
    if (j.redirect) location.href = j.redirect;
  };
  return (
    <div className="mt-6 grid gap-2">
      <button disabled={busy} onClick={() => go("success")} className="btn btn-primary">模擬付款成功</button>
      <button disabled={busy} onClick={() => go("fail")} className="btn btn-quiet">模擬付款失敗</button>
    </div>
  );
}
