"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KINDS } from "@/lib/kinds";

/** 新帳號的第一步：選一種演出情境，選完就套好預設值，可以直接開演 */
export function StartForm({ name }: { name: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("");
  const [who, setWho] = useState(name === "新朋友" ? "" : name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!kind) return setErr("先選一種演出情境");
    if (!who.trim()) return setErr("填一個觀眾看得到的名字");
    setBusy(true);
    setErr("");
    const r = await fetch("/api/dashboard/kind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name: who.trim() }),
    });
    setBusy(false);
    if (!r.ok) return setErr("存檔失敗，請再試一次");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <label className="field max-w-[360px]">
        <span className="label">觀眾看到的名字</span>
        <input className="input" value={who} onChange={(e) => setWho(e.target.value)} placeholder="例如：阿哲的街頭吉他" maxLength={40} />
      </label>

      <div>
        <span className="label">你主要是哪一種演出？</span>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {KINDS.map((k) => (
            <button
              key={k.slug}
              type="button"
              onClick={() => setKind(k.slug)}
              className={`card flex flex-col gap-2 p-5 text-left transition ${kind === k.slug ? "!border-ink !bg-raised ring-2 ring-ink" : ""}`}
            >
              <strong className="text-[18px]">{k.name}</strong>
              <span className="text-[15px] font-medium text-ink2">{k.pitch}</span>
              <span className="small leading-6">{k.desc}</span>
              <span className="small mt-1 text-ink3">
                預設排隊 {k.maxQueue} 首・金額 {k.amounts.join("／")}・{k.menu.length} 首範例歌單
              </span>
            </button>
          ))}
        </div>
        <p className="small mt-3">選完會幫你把排隊上限、金額、歌單範本都設好，之後都能改。</p>
      </div>

      {err && <p className="text-[14px] text-err">{err}</p>}
      <div><button onClick={save} disabled={busy} className="btn btn-primary">{busy ? "設定中…" : "完成，開始使用"}</button></div>
    </div>
  );
}
