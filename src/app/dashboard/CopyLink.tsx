"use client";
import { useState } from "react";

/** 複製點歌頁連結，貼到 IG 或 LINE 用 */
export function CopyLink({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="tag tag-quiet !h-8"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1600); } catch { /* 瀏覽器不給就算了 */ }
      }}
    >
      {ok ? "已複製連結" : "複製點歌頁連結"}
    </button>
  );
}
