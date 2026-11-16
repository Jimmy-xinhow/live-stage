import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePerformer } from "@/lib/auth";
import { FanError, messageFans } from "@/lib/fans";

const Body = z.object({
  segment: z.enum(["all", "new", "regular", "big", "sleeping"]).optional(),
  fanId: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(300),
});

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  try {
    return NextResponse.json(await messageFans(auth.performer, parsed.data, parsed.data.text));
  } catch (e) {
    if (e instanceof FanError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
