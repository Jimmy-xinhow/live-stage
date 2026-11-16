"use client";

export type Liff = {
  init: (o: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  isInClient: () => boolean;
  login: (o?: { redirectUri?: string }) => void;
  getIDToken: () => string | null;
  getFriendship?: () => Promise<{ friendFlag: boolean }>;
};
declare global {
  interface Window { liff?: Liff }
}

let ready: Promise<Liff | null> | null = null;

/** 載入並初始化 LIFF（同頁只做一次） */
export function initLiff(liffId: string): Promise<Liff | null> {
  if (!liffId) return Promise.resolve(null);
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const go = async () => {
      try {
        await window.liff!.init({ liffId });
        resolve(window.liff!);
      } catch (e) {
        console.warn("LIFF init failed", e);
        resolve(null);
      }
    };
    if (window.liff) return void go();
    const s = document.createElement("script");
    s.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    s.onload = go;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return ready;
}

/** 金流規定要用整頁表單 POST 導轉 */
export function submitForm(action: string, fields: Record<string, string>) {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = action;
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}
