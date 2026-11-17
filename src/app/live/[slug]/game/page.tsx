import { getPerformerBySlug } from "@/lib/orders";
import { currentGame, publicGame } from "@/lib/games";
import { GameScreen } from "./GameScreen";
import { notFound } from "next/navigation";
import { battleGamesOn } from "@/lib/features";
import { sessionMode } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {

  const p = await getPerformerBySlug((await params).slug);
  if (!p) notFound();
  if (!battleGamesOn(await sessionMode(p.liveSessionId))) notFound();
  return <GameScreen slug={p.slug} name={p.displayName} initial={publicGame(await currentGame(p.id), null, p.id)} />;
}
