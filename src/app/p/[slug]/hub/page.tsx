import { getPerformerBySlug, publicState } from "@/lib/orders";
import { getFan } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { hubState } from "@/lib/hub";
import { currentGame, publicGame } from "@/lib/games";
import { APP_NAME, env } from "@/lib/env";
import { HubApp } from "./HubApp";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";
export const metadata = { title: `現場互動｜${APP_NAME}`, robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!FEATURES.games) notFound();
  const p = await getPerformerBySlug((await params).slug);
  if (!p || p.status === "suspended") notFound();
  const fanId = await getFanId();
  const fan = await getFan(fanId);
  const [hub, st, game] = await Promise.all([hubState(p, fanId), publicState(p), currentGame(p.id)]);
  const playing = st.queue.find((q) => q.status === "playing");
  const next = st.queue.find((q) => q.status === "waiting");
  return (
    <HubApp
      slug={p.slug} name={p.displayName} avatar={p.avatarUrl}
      initial={hub} nowPlaying={playing ? { title: playing.title, by: playing.name } : null} nextTitle={next?.title ?? null} waiting={st.queue.filter((q) => q.status === "waiting").length}
      gameOn={publicGame(game, null, p.id)?.status === "running" ? publicGame(game, null, p.id)!.name : null}
      fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null}
    />
  );
}
