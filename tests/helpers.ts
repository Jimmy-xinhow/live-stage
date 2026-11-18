import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { fans, follows, liveSessions, performers, type Performer } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

let n = 0;
const uniq = () => `t${Date.now().toString(36)}${(n++).toString(36)}`;

/** 建一位表演者。預設免費方案、有點數、可以用收款碼收款 */
export async function mkPerformer(over: Partial<typeof performers.$inferInsert> = {}): Promise<Performer> {
  const db = await getDb();
  const slug = (over.slug as string) ?? uniq();
  const [p] = await db
    .insert(performers)
    .values({
      displayName: `測試-${slug}`,
      lineUserId: `U${slug}`,
      pointsCents: 200_00,
      payMethods: [{ type: "linepay", label: "LINE Pay", qrText: "https://example.test/pay", imageData: null }] as never,
      ...over,
      slug,
    })
    .returning();
  return p;
}

/** 開演。回傳帶著 liveSessionId 的表演者 */
export async function goLiveFor(p: Performer, mode = "indoor"): Promise<Performer> {
  const db = await getDb();
  const [s] = await db.insert(liveSessions).values({ performerId: p.id, location: "測試場地", mode }).returning();
  const [row] = await db.update(performers).set({ liveSessionId: s.id }).where(eq(performers.id, p.id)).returning();
  return row;
}

export async function mkFan(name = "觀眾") {
  const db = await getDb();
  const [f] = await db.insert(fans).values({ lineUserId: `U${uniq()}`, name }).returning();
  return f;
}

export async function follow(performerId: string, fanId: string, notifyLive = true) {
  const db = await getDb();
  await db.insert(follows).values({ performerId, fanId, notifyLive }).onConflictDoNothing();
}

export async function reload(id: string): Promise<Performer> {
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.id, id));
  return p;
}

export const nextMonth = (d = new Date()) => new Date(d.getTime() + 30 * 86400_000);
export const yesterday = () => new Date(Date.now() - 86400_000);
export const pay = { paymentType: "Credit", gatewayTradeNo: randomUUID().slice(0, 20), raw: null };
