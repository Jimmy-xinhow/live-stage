import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminSession } from "@/lib/session";

/** 管理密碼登入：沒設 ADMIN_PASSWORD 就一律拒絕 */
export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const ok = !!env.adminPassword && password.length === env.adminPassword.length && password === env.adminPassword;
  if (!ok) return NextResponse.redirect(`${env.baseUrl}/admin/login?error=1`, 303);
  await createAdminSession();
  return NextResponse.redirect(`${env.baseUrl}/admin`, 303);
}
