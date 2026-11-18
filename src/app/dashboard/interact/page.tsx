import { requirePerformer } from "@/lib/auth";
import { consoleState } from "@/lib/hub";
import { currentGame, GAME_TYPES, publicGame } from "@/lib/games";
import { InteractConsole } from "./InteractConsole";
import { liveNow } from "@/lib/fans";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import { planHasGames } from "@/lib/plans";
import Link from "next/link";
import { effectivePlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!FEATURES.games) notFound();
  const auth = await requirePerformer();
  if (!auth) return null;
  const p = auth.performer;
  const others = (await liveNow(20)).filter((x) => x.slug !== p.slug).map((x) => ({ slug: x.slug, name: x.name }));

  // 功能不該無聲消失。沒買互動方案的人要看得到這裡有什麼、以及怎麼打開。
  if (!planHasGames(effectivePlan(p)))
    return (
      <div className="mx-auto max-w-[620px] px-5 py-10">
        <h1 className="h2">互動遊戲</h1>
        <p className="mt-3 leading-7">
          八款現場遊戲——兵團對戰、拔河大賽、歌曲賽跑、攻城魔王戰、集氣解鎖、猜歌王、命運轉盤，
          還有跟另一位正在開播的表演者對決的跨表演者 PK。
        </p>
        <p className="mt-3 leading-7">
          這些在<strong>互動方案</strong>以上才會打開，而且只在線上直播模式跑——
          街頭場不會出現，站著聽三分鐘的人不會想玩遊戲。
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/pricing" className="btn btn-now">看互動方案</Link>
          <Link href="/dashboard/stage" className="btn btn-secondary">回演出控制台</Link>
        </div>
        <p className="mt-5 text-[14px] leading-6 text-[#6b6a66]">
          想先試再決定：跟我們說一聲，第一場演出免費開著，覺得不值再關掉。
        </p>
      </div>
    );

  return (
    <InteractConsole
      slug={p.slug}
      initial={{ hub: await consoleState(p), game: publicGame(await currentGame(p.id), null, p.id) }}
      types={Object.entries(GAME_TYPES).map(([id, t]) => ({ id, name: t.name, desc: t.desc, min: t.lanes[0], max: t.lanes[1], goal: t.goal }))}
      liveNow={others}
    />
  );
}
