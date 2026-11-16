import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { ACTS, OCCASIONS } from "@/lib/acts";
import { AREAS } from "@/lib/areas";

const url = z.string().trim().max(300).refine((v) => v === "" || /^https:\/\//.test(v), "網址需以 https:// 開頭");
const Body = z.object({
  actType: z.enum(ACTS.map((a) => a.slug) as [string, ...string[]]),
  bio: z.string().trim().max(400),
  genres: z.string().trim().max(60),
  bookable: z.boolean(),
  priceFrom: z.number().int().min(0).max(1_000_000).nullable(),
  occasions: z.array(z.enum(OCCASIONS as [string, ...string[]])).max(8),
  serviceAreas: z.array(z.enum(AREAS.map((a) => a.slug) as [string, ...string[]])).max(22),
  coverUrl: url,
  videoUrl: url,
  streamUrl: url,
  lat: z.string().trim().max(20).default(""),
  lng: z.string().trim().max(20).default(""),
  resetOverlay: z.boolean().default(false),
});

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "格式錯誤" }, { status: 400 });
  const { resetOverlay, lat, lng, ...rest } = parsed.data;
  const ok = (v: string, min: number, max: number) => (v && Number(v) >= min && Number(v) <= max ? v : null);
  const b = { ...rest, lat: ok(lat, -90, 90), lng: ok(lng, -180, 180) };
  const db = await getDb();
  const token = resetOverlay || !auth.performer.overlayToken ? crypto.randomBytes(9).toString("base64url") : auth.performer.overlayToken;
  await db.update(performers).set({ ...b, coverUrl: b.coverUrl || null, videoUrl: b.videoUrl || null, streamUrl: b.streamUrl || null, overlayToken: token }).where(eq(performers.id, auth.performer.id));
  return NextResponse.json({ ok: true, overlayToken: token });
}
