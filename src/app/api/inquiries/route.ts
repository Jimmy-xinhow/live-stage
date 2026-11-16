import { NextResponse } from "next/server";
import { z } from "zod";
import { getFanId } from "@/lib/session";
import { createInquiry, MarketError } from "@/lib/market";
import { AREAS } from "@/lib/areas";
import { ACTS, OCCASIONS } from "@/lib/acts";

const Body = z.object({
  contactName: z.string().trim().min(1).max(30),
  occasion: z.enum(OCCASIONS as [string, ...string[]]),
  actType: z.enum(ACTS.map((a) => a.slug) as [string, ...string[]]).nullable().default(null),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeText: z.string().trim().max(40).default(""),
  city: z.enum(AREAS.map((a) => a.slug) as [string, ...string[]]),
  place: z.string().trim().max(60).default(""),
  guests: z.string().max(20).default(""),
  budget: z.string().max(30).default(""),
  note: z.string().trim().max(300).default(""),
  to: z.string().max(40).nullable().default(null),
  broadcast: z.boolean().default(false),
});

export async function POST(req: Request) {
  const fanId = await getFanId();
  if (!fanId) return NextResponse.json({ error: "請先用 LINE 登入，報價會傳到你的 LINE" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "請把必填欄位填完整" }, { status: 400 });
  if (new Date(parsed.data.eventDate + "T23:59:59+08:00").getTime() < Date.now()) return NextResponse.json({ error: "活動日期已經過了" }, { status: 400 });
  try {
    return NextResponse.json(await createInquiry(fanId, parsed.data));
  } catch (e) {
    if (e instanceof MarketError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
