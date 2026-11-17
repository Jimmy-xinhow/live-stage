import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/line";
import { upsertFan } from "@/lib/fans";
import { createFanSession } from "@/lib/session";
import { LIMITS, guard } from "@/lib/ratelimit";

// LIFF 取得的 ID token 交給伺服器驗證後才建立粉絲身分
export async function POST(req: Request) {
  const rl = guard(req, "fanlogin", LIMITS.auth);
  if (rl) return rl;
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  const profile = idToken ? await verifyIdToken(idToken) : null;
  if (!profile) return NextResponse.json({ error: "LINE 驗證失敗" }, { status: 401 });
  const fan = await upsertFan(profile);
  await createFanSession(fan.id);
  return NextResponse.json({ fan: { name: fan.name, avatar: fan.avatarUrl } });
}
