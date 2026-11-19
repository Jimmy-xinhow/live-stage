"use client";

import { useEffect, useRef, useState } from "react";
import { getJson } from "@/lib/net";

/**
 * 訂閱現場狀態。
 *
 * 先試 SSE：伺服器一有變動就推過來，而且一位表演者只查一次資料庫，
 * 不管現場有十個人還是三百個人。
 *
 * 連不上就退回輪詢——有些公司網路或瀏覽器外掛會把 SSE 擋掉，
 * 那時候慢一點總比完全不動好。
 */
export function useLive<S, G>(
  slug: string,
  initial: { state: S; game?: G },
  opts: { game?: boolean; pollMs?: number } = {},
) {
  const [state, setState] = useState<S>(initial.state);
  const [game, setGame] = useState<G | null>(initial.game ?? null);
  /** 連續失敗才顯示「連線不穩」，現場訊號抖一下是常態 */
  const [shaky, setShaky] = useState(false);
  const misses = useRef(0);

  useEffect(() => {
    let stopped = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const ok = () => {
      misses.current = 0;
      setShaky(false);
    };

    /** 退回輪詢。間隔比原本長，因為這是備案不是主要路徑 */
    const poll = async () => {
      if (stopped) return;
      const s = await getJson<S>(`/api/p/${slug}/state`);
      if (stopped) return;
      if (s) {
        setState(s);
        ok();
      } else {
        misses.current += 1;
        if (misses.current >= 2) setShaky(true);
      }
      if (opts.game) {
        const g = await getJson<{ game: G }>(`/api/p/${slug}/game`);
        if (g && !stopped) setGame(g.game);
      }
      pollTimer = setTimeout(poll, misses.current ? Math.min(30_000, 5000 * 2 ** misses.current) : (opts.pollMs ?? 5000));
    };

    if (typeof EventSource === "undefined") {
      void poll();
      return () => { stopped = true; if (pollTimer) clearTimeout(pollTimer); };
    }

    es = new EventSource(`/api/p/${slug}/stream`);
    es.addEventListener("state", (e) => { setState(JSON.parse((e as MessageEvent).data)); ok(); });
    es.addEventListener("game", (e) => { setGame(JSON.parse((e as MessageEvent).data)); ok(); });
    es.addEventListener("ping", ok);
    es.onerror = () => {
      // EventSource 自己會重連；連續失敗才告訴使用者，並同時起一輪輪詢墊著
      misses.current += 1;
      if (misses.current >= 2 && !stopped) {
        setShaky(true);
        if (!pollTimer) void poll();
      }
    };

    const wake = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", wake);

    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [slug, opts.game, opts.pollMs]);

  return { state, game, setGame, shaky };
}
