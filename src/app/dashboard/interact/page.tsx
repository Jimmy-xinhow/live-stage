import { requirePerformer } from "@/lib/auth";
import { consoleState } from "@/lib/hub";
import { currentGame, GAME_TYPES, publicGame } from "@/lib/games";
import { InteractConsole } from "./InteractConsole";
import { liveNow } from "@/lib/fans";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requirePerformer();
  if (!auth) return null;
  const p = auth.performer;
  const others = (await liveNow(20)).filter((x) => x.slug !== p.slug).map((x) => ({ slug: x.slug, name: x.name }));
  return (
    <InteractConsole
      slug={p.slug}
      initial={{ hub: await consoleState(p), game: publicGame(await currentGame(p.id), null, p.id) }}
      types={Object.entries(GAME_TYPES).map(([id, t]) => ({ id, name: t.name, desc: t.desc, min: t.lanes[0], max: t.lanes[1], goal: t.goal }))}
      liveNow={others}
    />
  );
}
