import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeCode, verifyIdToken } from "@/lib/line";
import { verifyState } from "@/lib/session";
import { homeOf, loginWithLine } from "@/lib/auth";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const fail = NextResponse.redirect(`${env.baseUrl}/login?error=1`);
  if (!code || !state) return fail;
  let role: "performer" | "organizer" = "performer";
  try {
    role = (await verifyState(state)).role === "organizer" ? "organizer" : "performer";
  } catch {
    return fail;
  }
  const tok = await exchangeCode(code);
  const profile = tok && (await verifyIdToken(tok.id_token));
  if (!profile) return fail;
  const p = await loginWithLine(profile, role);
  return NextResponse.redirect(`${env.baseUrl}${homeOf(p.accountType)}`);
}
