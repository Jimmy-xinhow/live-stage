import { NextResponse } from "next/server";
import { getPerformerBySlug, publicState } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await publicState(p));
}
