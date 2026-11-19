"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/net";

/** 認領團員身分。不登入、不註冊——點一下就好 */
export function JoinClient({ code }: { code: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function join() {
    setBusy(true);
    setErr("");
    try {
      await postJson("/api/band/join", { code }, { idempotent: true });
      r.push("/band/me");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加入失敗");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <button onClick={join} disabled={busy} className="btn btn-now">
        {busy ? "處理中…" : "加入這個團"}
      </button>
      {err && <p className="small text-err">{err}</p>}
      <p className="small">邀請碼：<code>{code}</code></p>
      <p className="small">加入之後，這台裝置就看得到你自己分到多少。換手機的話跟團長要一組新的邀請碼。</p>
    </div>
  );
}
