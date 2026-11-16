import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { pendingClaims } from "@/lib/rewards";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const items = await pendingClaims(auth.performer);
  return NextResponse.json({ items: items.map((i) => ({ ...i, requestedAt: i.requestedAt?.toISOString() ?? null })) });
}
