"use client";

import { useCallback, useState } from "react";
import { postJson } from "@/lib/net";

export type FanInfo = { name: string; avatar: string | null } | null;

/**
 * 觀眾身分。
 *
 * 沒有登入這件事。掃碼進來就是客人，第一次需要記住他的時候（追蹤、簽到、許願、
 * 遊戲裡的「我」）才在伺服器建一列並發一張 cookie。
 *
 * 這樣設計的理由很實際：現場的人站在台前，手上拿著手機，願意花在「登入」
 * 這件事上的耐心接近零。能少一步就少一步。
 */
export function useFan(initial: FanInfo) {
  const [fan, setFan] = useState<FanInfo>(initial);

  /** 確保這台裝置有身分。回傳 false 代表伺服器那邊出了問題，呼叫端要顯示錯誤 */
  const ensureFan = useCallback(async (name?: string): Promise<boolean> => {
    if (fan) return true;
    try {
      const r = await postJson<{ fan: FanInfo }>("/api/fan/start", { name }, { idempotent: true });
      setFan(r.fan);
      return true;
    } catch {
      return false;
    }
  }, [fan]);

  return { fan, setFan, ensureFan };
}

export async function followApi(slug: string, follow: boolean) {
  const r = await fetch("/api/fan/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, follow }) });
  return r.ok;
}
