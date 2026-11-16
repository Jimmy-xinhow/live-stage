import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearAdminSession } from "@/lib/session";

export async function POST() {
  await clearAdminSession();
  return NextResponse.redirect(`${env.baseUrl}/`, 303);
}
