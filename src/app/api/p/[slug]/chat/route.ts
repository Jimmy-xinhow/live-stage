import { NextResponse } from "next/server";
import { getPerformerBySlug } from "@/lib/orders";
import { chatState, pollChat } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** 大螢幕與浮層輪詢：順便拉一次直播聊天室（有間隔保護） */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  await pollChat(p).catch(() => null);
  return NextResponse.json(await chatState(p));
}
