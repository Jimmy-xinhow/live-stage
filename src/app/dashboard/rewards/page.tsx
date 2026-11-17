import { asc, eq, sql } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { achievements, fanAchievements } from "@/lib/db/schema";
import { AchievementsManager } from "./AchievementsManager";
import { PendingRewards } from "./PendingRewards";
import { Empty, PageHead, Section } from "@/components/back/Shell";

export default async function Rewards() {
  const { performer: p } = (await requirePerformer())!;
  const db = await getDb();
  const list = await db.select().from(achievements).where(eq(achievements.performerId, p.id)).orderBy(asc(achievements.kind), asc(achievements.threshold));
  const stats = await db
    .select({ a: fanAchievements.achievementId, unlocked: sql<number>`count(*)::int`, redeemed: sql<number>`count(*) filter (where ${fanAchievements.status} = 'redeemed')::int`, requested: sql<number>`count(*) filter (where ${fanAchievements.status} = 'requested')::int` })
    .from(fanAchievements)
    .where(eq(fanAchievements.performerId, p.id))
    .groupBy(fanAchievements.achievementId);
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="成就與獎勵" desc={<>粉絲累計支持達標就自動解鎖並收到 LINE 通知，徽章顯示在排行、排隊與留言牆。</>} />
      <section className="sec">
        <h2 className="h2">待兌換獎勵</h2>
        <p className="small mb-1">粉絲在現場按「領取」會出現兌換碼，核對後按已兌換。LINE 也會通知你，可以直接在 LINE 按。</p>
        <PendingRewards />
      </section>
      <AchievementsManager
        items={list.map((a) => {
          const s = stats.find((x) => x.a === a.id);
          return { id: a.id, name: a.name, emoji: a.emoji, kind: a.kind as "total" | "count", threshold: a.threshold, reward: a.reward, stock: a.stock, active: a.active, unlocked: Number(s?.unlocked ?? 0), redeemed: Number(s?.redeemed ?? 0), requested: Number(s?.requested ?? 0) };
        })}
      />
    </div>
  );
}
