import { NextResponse } from "next/server";
import { getFanId } from "@/lib/session";
import { getPerformerBySlug } from "@/lib/orders";
import { setNotify } from "@/lib/fans";

export async function POST(req: Request) {
  const fanId = await getFanId();
  if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入" }, { status: 401 });
  const { slug, notifyLive } = (await req.json()) as { slug: string; notifyLive: boolean };
  const p = await getPerformerBySlug(slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  await setNotify(p.id, fanId, !!notifyLive);
  return NextResponse.json({ ok: true });
}
