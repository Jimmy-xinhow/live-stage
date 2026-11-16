import { asc, eq } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { MenuEditor } from "./MenuEditor";

export default async function MenuPage() {
  const { performer: p } = (await requirePerformer())!;
  const db = await getDb();
  const items = await db.select().from(menuItems).where(eq(menuItems.performerId, p.id)).orderBy(asc(menuItems.sort));
  return <MenuEditor items={items.map((m) => ({ id: m.id, title: m.title, subtitle: m.subtitle, category: m.category, price: m.price, enabled: m.enabled, requestCount: m.requestCount }))} />;
}
