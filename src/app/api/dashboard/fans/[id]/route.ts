import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { fanHistory } from "@/lib/fans";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const rows = await fanHistory(auth.performer.id, (await params).id);
  return NextResponse.json({ items: rows.map((r) => ({ ...r, paidAt: r.paidAt?.toISOString() ?? null })) });
}
