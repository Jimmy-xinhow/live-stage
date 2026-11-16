import { NextResponse } from "next/server";
import { requirePerformer } from "@/lib/auth";
import { OrderError, queueAction } from "@/lib/orders";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { action } = (await req.json()) as { action: "start" | "done" | "skip" };
  if (!["start", "done", "skip"].includes(action)) return NextResponse.json({ error: "bad action" }, { status: 400 });
  try {
    await queueAction(auth.performer, (await params).id, action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
