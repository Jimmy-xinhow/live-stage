import { getPerformerBySlug, payOptions } from "@/lib/orders";
import { getFan } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { currentGame, publicGame } from "@/lib/games";
import { env } from "@/lib/env";
import { GameApp } from "./GameApp";
import { notFound } from "next/navigation";
import { battleGamesOn } from "@/lib/features";
import { sessionMode } from "@/lib/orders";
import { effectivePlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const metadata = { title: `互動遊戲`, robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p || p.status === "suspended") notFound();
  if (!battleGamesOn(await sessionMode(p.liveSessionId), effectivePlan(p))) notFound();
  const fanId = await getFanId();
  const fan = await getFan(fanId);
  const opts = payOptions(p);
  return <GameApp slug={p.slug} name={p.displayName} initial={publicGame(await currentGame(p.id), fanId, p.id)} payMode={opts.auto ? "auto" : opts.manual ? "manual" : null} fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null} />;
}
