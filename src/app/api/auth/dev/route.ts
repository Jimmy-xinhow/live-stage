import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { createSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { homeOf } from "@/lib/auth";

// 開發用登入：DEV_LOGIN=true 才開放。?as=slug 登入示範表演者，?org=1 登入示範主辦
export async function GET(req: Request) {
  if (!env.allowDevLogin) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const slug = q.get("org") ? "demo-venue" : q.get("as") ?? "demo";
  const db = await getDb();
  const [p] = await db.select().from(performers).where(eq(performers.slug, slug));
  if (!p) return NextResponse.json({ error: "no such account" }, { status: 404 });
  await createSession({ performerId: p.id, isAdmin: p.accountType === "performer" });
  return NextResponse.redirect(`${env.baseUrl}${homeOf(p.accountType)}`);
}
