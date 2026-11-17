import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { menuItems, performers } from "./db/schema";
import { KINDS, kindBySlug, type KindSlug } from "./kinds";

/**
 * 套用情境型態的預設值。新帳號選完型態就能直接開演，不用先填十個欄位。
 *
 * 只覆寫「還是出廠預設」的欄位，已經自己改過的不動；歌單則只在完全沒有時才建。
 */
export async function applyKind(performerId: string, slug: KindSlug) {
  const k = kindBySlug(slug);
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.id, performerId));
  if (!p) return null;

  const untouched = p.maxQueue === 15 && p.presetAmounts.length === 4 && p.presetAmounts[0] === 50;
  const [next] = await db
    .update(performers)
    .set({
      kind: k.slug,
      ...(untouched ? { maxQueue: k.maxQueue, presetAmounts: k.amounts } : {}),
      // 線上直播沒有實體地點，也不會用個人收款碼
      ...(k.slug === "streamer" ? { lat: null, lng: null } : {}),
    })
    .where(eq(performers.id, performerId))
    .returning();

  const existing = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.performerId, performerId)).limit(1);
  if (!existing.length) {
    await db.insert(menuItems).values(k.menu.map((m, i) => ({ performerId, title: m.title, subtitle: m.subtitle, category: m.category, price: m.price, sort: i })));
  }
  return next;
}

/**
 * 還沒走過引導的帳號。
 * kind 有資料庫預設值（street），不能拿來判斷，所以用「名字還是系統給的」＋「歌單是空的」。
 */
export function needsOnboarding(p: { displayName: string; menuCount: number }) {
  return p.displayName === "新朋友" || p.menuCount === 0;
}

export const KIND_OPTIONS = KINDS.map((k) => ({ slug: k.slug, name: k.name, pitch: k.pitch, desc: k.desc }));
