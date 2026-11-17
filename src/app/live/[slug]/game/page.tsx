import { getPerformerBySlug } from "@/lib/orders";
import { currentGame, publicGame } from "@/lib/games";
import { GameScreen } from "./GameScreen";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!FEATURES.games) notFound();
  const p = await getPerformerBySlug((await params).slug);
  if (!p) notFound();
  return <GameScreen slug={p.slug} name={p.displayName} initial={publicGame(await currentGame(p.id), null, p.id)} />;
}
