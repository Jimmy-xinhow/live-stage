"use client";

import { useState } from "react";
import Link from "next/link";
import { postJson } from "@/lib/net";

type Mode = "signin" | "signup" | "forgot";

/**
 * 表演者的登入／註冊／忘記密碼。
 *
 * 三種狀態放在同一張表單裡切換，不各自一頁：使用者在這裡的目的只有一個
 * ——進去——而他常常不確定自己到底註冊過沒有。
 */
export function AuthForm({ initial = "signin" }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const r = await postJson<{ home: string }>("/api/auth/signin", { email, password });
        location.href = r.home;
        return;
      }
      if (mode === "signup") {
        await postJson("/api/auth/signup", { email, password, displayName: name });
        location.href = "/dashboard";
        return;
      }
      await postJson("/api/auth/forgot", { email });
      setDone("如果這個信箱有註冊過，重設密碼的信已經寄出去了。一小時內有效。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "出了點問題，再試一次");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "登入" : mode === "signup" ? "建立帳號" : "忘記密碼";

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <h1 className="h1">{title}</h1>
      {mode === "signup" && <p className="small">建立帳號就送 200 點，開一場演出綽綽有餘。</p>}
      {mode === "forgot" && <p className="small">填你註冊用的信箱，我們寄一條重設連結給你。</p>}

      {mode === "signup" && (
        <label className="flex flex-col gap-1.5">
          <span className="label">你的名字或團名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={40}
            autoComplete="nickname"
            placeholder="阿哲的街頭吉他"
            className="input"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="label">信箱</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={160}
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="input"
        />
      </label>

      {mode !== "forgot" && (
        <label className="flex flex-col gap-1.5">
          <span className="label">密碼</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={200}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="input"
          />
          {mode === "signup" && <span className="small">至少 10 個字。用一句你記得住的話就好，長比複雜更安全。</span>}
        </label>
      )}

      {error && <p className="rounded-[12px] bg-sunken px-3 py-2 text-[14px] text-err">{error}</p>}
      {done && <p className="rounded-[12px] bg-sunken px-3 py-2 text-[14px]">{done}</p>}

      <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">
        {busy ? "處理中" : title}
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
        {mode !== "signin" && (
          <button type="button" className="underline" onClick={() => { setMode("signin"); setError(""); setDone(""); }}>
            已經有帳號，去登入
          </button>
        )}
        {mode !== "signup" && (
          <button type="button" className="underline" onClick={() => { setMode("signup"); setError(""); setDone(""); }}>
            還沒有帳號，建一個
          </button>
        )}
        {mode !== "forgot" && (
          <button type="button" className="underline" onClick={() => { setMode("forgot"); setError(""); setDone(""); }}>
            忘記密碼
          </button>
        )}
      </div>

      <p className="small mt-2">
        建立帳號表示你同意 <Link href="/terms" className="underline">服務條款</Link> 與 <Link href="/privacy" className="underline">隱私權政策</Link>。
      </p>
    </form>
  );
}
