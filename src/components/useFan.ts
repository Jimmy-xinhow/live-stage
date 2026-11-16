"use client";

import { useCallback, useEffect, useState } from "react";
import { initLiff } from "@/lib/liff-client";

export type FanInfo = { name: string; avatar: string | null } | null;

/**
 * 觀眾身分：在 LINE 內（LIFF）自動登入；在一般瀏覽器按追蹤時才導去 LINE 登入。
 * 開發模式沒有 LIFF 時用測試觀眾身分。
 */
export function useFan(initial: FanInfo, liffId: string, devLogin: boolean) {
  const [fan, setFan] = useState<FanInfo>(initial);
  const [liffOk, setLiffOk] = useState(false);

  useEffect(() => {
    initLiff(liffId).then(async (liff) => {
      if (!liff) return;
      setLiffOk(true);
      if (!initial && liff.isLoggedIn()) {
        const r = await fetch("/api/fan/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: liff.getIDToken() }) });
        if (r.ok) setFan((await r.json()).fan);
      }
    });
  }, [liffId, initial]);

  const ensureFan = useCallback(async (): Promise<boolean> => {
    if (fan) return true;
    if (liffOk && window.liff) {
      window.liff.login({ redirectUri: location.href });
      return false;
    }
    if (devLogin) {
      const r = await fetch("/api/fan/dev", { method: "POST" });
      if (r.ok) {
        setFan((await r.json()).fan);
        return true;
      }
    }
    return false;
  }, [fan, liffOk, devLogin]);

  return { fan, ensureFan, liffOk };
}

export async function followApi(slug: string, follow: boolean) {
  const r = await fetch("/api/fan/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, follow }) });
  return r.ok;
}
