import { NextResponse } from "next/server";
import { getFan, liveNow, myFollowing, myOrders } from "@/lib/fans";
import { getFanId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const fan = await getFan(await getFanId());
  if (!fan) return NextResponse.json({ fan: null, following: [], orders: [], liveNow: await liveNow() });
  const [following, orders, live] = await Promise.all([myFollowing(fan.id), myOrders(fan.id), liveNow()]);
  return NextResponse.json({ fan: { name: fan.name, avatar: fan.avatarUrl }, following, orders, liveNow: live });
}
