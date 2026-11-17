import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireOrganizer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { AREAS } from "@/lib/areas";
import { featureGate } from "@/lib/features";

const Body = z.object({
  displayName: z.string().trim().min(1).max(40),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,40}$/),
  orgKind: z.enum(["venue", "organizer", "brand", "other"]),
  city: z.enum(AREAS.map((a) => a.slug) as [string, ...string[]]),
  district: z.string().max(30).default(""),
  address: z.string().max(100).default(""),
  website: z.string().max(200).default(""),
  bio: z.string().max(800).default(""),
  avatarUrl: z.string().max(300).default(""),
});

export async function POST(req: Request) {
  const off = featureGate("events");
  if (off) return off;
  const auth = await requireOrganizer();
  if (!auth) return NextResponse.json({ error: "請用店家／主辦帳號登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "網址代號只能用小寫英數字與減號，至少 3 碼" }, { status: 400 });
  const b = parsed.data;
  const db = await getDb();
  const [taken] = await db.select({ id: performers.id }).from(performers).where(eq(performers.slug, b.slug));
  if (taken && taken.id !== auth.performer.id) return NextResponse.json({ error: "這個網址代號已經有人用了" }, { status: 409 });
  await db.update(performers).set({ ...b, avatarUrl: b.avatarUrl || null }).where(eq(performers.id, auth.performer.id));
  return NextResponse.json({ ok: true });
}
