"use client";

import { useEffect, useState } from "react";
import type { PublicGame } from "@/lib/games";
import { GameView } from "@/components/GameView";

export function GameScreen({ slug, name, initial }: { slug: string; name: string; initial: PublicGame | null }) {
  const [g, setG] = useState(initial);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(async () => {
      setNow(Date.now());
      const r = await fetch(`/api/p/${slug}/game`);
      if (r.ok) setG((await r.json()).game);
    }, 1000);
    return () => clearInterval(t);
  }, [slug]);
  return (
    <div className="stage h-dvh w-screen overflow-hidden">
      {g ? <GameView g={g} now={now} qr={`/api/qr/${slug}`} /> : <div className="flex h-full flex-col items-center justify-center gap-3"><div className="text-[3vw] font-bold">{name}</div><div className="text-[1.6vw] text-[#B9B5AC]">遊戲開始後會顯示在這裡</div></div>}
    </div>
  );
}
