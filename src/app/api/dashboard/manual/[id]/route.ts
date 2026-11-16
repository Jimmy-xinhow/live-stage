import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { confirmManual, OrderError, rejectManual } from "@/lib/orders";

const Body = z.object({ action: z.enum(["confirm", "reject"]), amount: z.number().int().positive().max(50000).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  const { id } = await params;
  try {
    if (parsed.data.action === "confirm") await confirmManual(auth.performer, { id }, parsed.data.amount);
    else await rejectManual(auth.performer, { id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
