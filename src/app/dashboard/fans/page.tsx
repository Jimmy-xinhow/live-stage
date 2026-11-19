import { and, asc, eq, gte } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { shows } from "@/lib/db/schema";
import { fanList, SEGMENT_LABEL } from "@/lib/fans";
import { env } from "@/lib/env";
import { FansManager } from "./FansManager";
import { ShowsManager } from "./ShowsManager";
import { PageHead } from "@/components/back/Shell";

export default async function Fans() {
  const { performer: p } = (await requirePerformer())!;
  const db = await getDb();
  const [list, upcoming] = await Promise.all([
    fanList(p.id),
    db.select().from(shows).where(and(eq(shows.performerId, p.id), gte(shows.startsAt, new Date()))).orderBy(asc(shows.startsAt)),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="粉絲" desc="追蹤你的人、他們的支持紀錄，以及演出預告的發布。" />
      <ShowsManager
        upcoming={upcoming.map((s) => ({ id: s.id, startsAt: s.startsAt.toISOString(), location: s.location, note: s.note }))}
      />
      <FansManager fans={list} segmentLabel={SEGMENT_LABEL} />
    </div>
  );
}
