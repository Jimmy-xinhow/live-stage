import { and, asc, eq, gte } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { shows } from "@/lib/db/schema";
import { fanList, SEGMENT_LABEL } from "@/lib/fans";
import { env } from "@/lib/env";
import { FansManager } from "./FansManager";
import { ShowsManager } from "./ShowsManager";

export default async function Fans() {
  const { performer: p } = (await requirePerformer())!;
  const db = await getDb();
  const [list, upcoming] = await Promise.all([
    fanList(p.id),
    db.select().from(shows).where(and(eq(shows.performerId, p.id), gte(shows.startsAt, new Date()))).orderBy(asc(shows.startsAt)),
  ]);
  const costPerFan = env.billing.liveNotifyCents / 100;
  return (
    <div className="flex flex-col gap-8">
      <h1 className="h1">粉絲</h1>
      <ShowsManager
        upcoming={upcoming.map((s) => ({ id: s.id, startsAt: s.startsAt.toISOString(), location: s.location, note: s.note, notified: s.notifiedCount }))}
        followers={list.filter((f) => f.notifyLive).length}
        costPerFan={costPerFan}
      />
      <FansManager fans={list} segmentLabel={SEGMENT_LABEL} costPerFan={costPerFan} />
    </div>
  );
}
