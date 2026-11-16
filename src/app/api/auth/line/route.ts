import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { loginAuthorizeUrl } from "@/lib/line";
import { signState } from "@/lib/session";

/** ?as=org：第一次登入時建立店家／主辦帳號（已有帳號則沿用原本的類型） */
export async function GET(req: Request) {
  const org = new URL(req.url).searchParams.get("as") === "org";
  if (!env.line.loginChannelId) {
    if (env.allowDevLogin) return NextResponse.redirect(`${env.baseUrl}/api/auth/dev?${org ? "org=1" : "as=demo"}`);
    return NextResponse.json({ error: "LINE Login 未設定" }, { status: 503 });
  }
  const nonce = crypto.randomBytes(8).toString("hex");
  const state = await signState({ nonce, role: org ? "organizer" : "performer" });
  return NextResponse.redirect(loginAuthorizeUrl(state, nonce));
}
