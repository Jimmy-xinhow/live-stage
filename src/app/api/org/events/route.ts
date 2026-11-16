import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganizer } from "@/lib/auth";
import { createEvent, EventError } from "@/lib/events";
import { AREAS } from "@/lib/areas";

export const Body = z.object({
  title: z.string().trim().min(1).max(60),
  city: z.enum(AREAS.map((a) => a.slug) as [string, ...string[]]),
  place: z.string().trim().max(60).default(""),
  address: z.string().trim().max(100).default(""),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().default(null),
  description: z.string().max(800).default(""),
  priceText: z.string().max(40).default(""),
  link: z.string().max(300).default(""),
  coverUrl: z.string().max(300).nullable().default(null),
  guestActs: z.string().max(200).default(""),
  performerSlugs: z.array(z.string().max(40)).max(8).default([]),
  lat: z.string().trim().max(20).default(""),
  lng: z.string().trim().max(20).default(""),
  notifyFans: z.boolean().default(false),
});

export async function POST(req: Request) {
  const auth = await requireOrganizer();
  if (!auth) return NextResponse.json({ error: "請用店家／主辦帳號登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "請把必填欄位填完整" }, { status: 400 });
  try {
    const ev = await createEvent(auth.performer, parsed.data);
    return NextResponse.json({ id: ev.id });
  } catch (e) {
    if (e instanceof EventError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
