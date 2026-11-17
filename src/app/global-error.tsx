"use client";

import { useEffect } from "react";

/** 整站的最後一道防線：畫面壞掉時至少給使用者一個能回去的地方，並把錯誤送回伺服器 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, digest: error.digest, path: location.pathname }),
    }).catch(() => {});
  }, [error]);
  return (
    <html lang="zh-Hant-TW">
      <body style={{ margin: 0, background: "#F4F1EA", color: "#151412", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "80px 20px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>這個頁面出了點問題</h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4B4740" }}>
            已經把錯誤回報給我們了。可以先重新整理試試，還是不行的話請稍後再來。
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={reset} style={{ border: "2px solid #151412", background: "#151412", color: "#F4F1EA", borderRadius: 14, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }}>重新載入</button>
            <a href="/" style={{ border: "2px solid #151412", background: "#FBFAF6", color: "#151412", borderRadius: 14, padding: "10px 18px", fontWeight: 700, textDecoration: "none" }}>回首頁</a>
          </div>
          {error.digest && <p style={{ fontSize: 12, color: "#6B665C", marginTop: 24 }}>錯誤代碼 {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
