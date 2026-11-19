import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { orders, performers } from "@/lib/db/schema";
import { orderStatus, MANUAL_TTL_MIN } from "@/lib/orders";
import { publicPayMethods } from "@/lib/paymethods";
import { OrderTracker } from "./OrderTracker";
import { env } from "@/lib/env";
import { getFan, isFollowing } from "@/lib/fans";
import { getFanId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ tradeNo: string }> }) {
  const { tradeNo } = await params;
  const s = await orderStatus(tradeNo);
  if (!s) notFound();
  let methods: Awaited<ReturnType<typeof publicPayMethods>> = [];
  if (s.payMode === "manual") {
    const db = await getDb();
    const [row] = await db.select({ m: performers.payMethods }).from(orders).innerJoin(performers, eq(performers.id, orders.performerId)).where(eq(orders.tradeNo, tradeNo));
    methods = await publicPayMethods(row?.m ?? []);
  }
  const fan = await getFan(await getFanId());
  const db2 = await getDb();
  const [o] = await db2.select({ pid: orders.performerId }).from(orders).where(eq(orders.tradeNo, tradeNo));
  const following = fan ? await isFollowing(o.pid, fan.id) : false;
  return (
    <OrderTracker
      tradeNo={tradeNo}
      initial={s}
      methods={methods}
      ttlMin={MANUAL_TTL_MIN}
      follow={{ following, fan: fan ? { name: fan.name, avatar: fan.avatarUrl } : null}}
    />
  );
}
