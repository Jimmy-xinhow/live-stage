"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFan, type FanInfo } from "@/components/useFan";

export function JoinClient({ code, liffId, devLogin, fan: initial }: { code: string; liffId: string; devLogin: boolean; fan: FanInfo }) {
  const r = useRouter();
  const { fan, ensureFan } = useFan(initial, liffId, devLogin);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function join() {
    setBusy(true); setErr("");
    if (!(await ensureFan())) { setBusy(false); setErr("要先用 LINE 登入才能加入"); return; }
    const res = await fetch("/api/band/join", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(j.error ?? "加入失敗"); return; }
    r.push("/band/me");
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button onClick={join} disabled={busy} className="btn btn-now">
        {busy ? "處理中…" : fan ? `以 ${fan.name} 的身分加入` : "用 LINE 登入並加入"}
      </button>
      {err && <p className="small text-err">{err}</p>}
      <p className="small">邀請碼：<code>{code}</code></p>
    </div>
  );
}
