"use client";

import { useEffect, useState } from "react";
import type { PublicGame } from "@/lib/games";
import { GameView } from "@/components/GameView";
import { useLive } from "@/components/useLive";

export function GameScreen({ slug, name, initial }: { slug: string; name: string; initial: PublicGame | null }) {
  const [now, setNow] = useState(0);
  // 大螢幕走伺服器推送。投影出去的畫面要跟現場的手指同步，但不該為此
  // 每秒各自查一次資料庫——那是整場最不能掛的一台機器。
  const { game: g } = useLive<null, PublicGame | null>(slug, { state: null, game: initial });
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="stage h-dvh w-screen overflow-hidden">
      {g ? <GameView g={g} now={now} qr={`/api/qr/${slug}`} /> : <div className="flex h-full flex-col items-center justify-center gap-3"><div className="text-[3vw] font-bold">{name}</div><div className="text-[1.6vw] text-[#B9B5AC]">遊戲開始後會顯示在這裡</div></div>}
    </div>
  );
}
