"use client";

import { useState } from "react";
import { postJson } from "@/lib/net";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await postJson("/api/auth/reset", { token, password });
      location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "出了點問題");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <h1 className="h1">設一組新密碼</h1>
      <label className="flex flex-col gap-1.5">
        <span className="label">新密碼</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={200} autoComplete="new-password" className="input" />
        <span className="small">至少 10 個字。用一句你記得住的話就好。</span>
      </label>
      {error && <p className="rounded-[12px] bg-sunken px-3 py-2 text-[14px] text-err">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">{busy ? "處理中" : "設定新密碼"}</button>
    </form>
  );
}
