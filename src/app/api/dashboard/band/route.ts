import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { LIMITS, guard } from "@/lib/ratelimit";
import { saveMembers } from "@/lib/band";
import { planHasPro } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";

const Body = z.object({
  members: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().max(40),
    sharePermille: z.number().int().min(0).max(1000),
  })).max(12),
});

export async function POST(req: Request) {
  const rl = guard(req, "band", LIMITS.write);
  if (rl) return rl;
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!planHasPro(effectivePlan(auth.performer)))
    return NextResponse.json({ error: "樂團拆帳要全部方案。在後台的「方案」頁可以升級。" }, { status: 402 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  const r = await saveMembers(auth.performer.id, parsed.data.members);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
