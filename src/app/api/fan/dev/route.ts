import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { upsertFan } from "@/lib/fans";
import { createFanSession } from "@/lib/session";

// 開發用：模擬一位已用 LINE 登入的觀眾
export async function POST(req: Request) {
  if (!env.allowDevLogin) return NextResponse.json({ error: "disabled" }, { status: 404 });
  // ?as=2 之類可以開第二位測試觀眾，方便測對戰與排行
  const as = new URL(req.url).searchParams.get("as") ?? "";
  const n = /^[a-z0-9]{1,8}$/i.test(as) ? as : "";
  const fan = await upsertFan({ userId: `Udev-viewer${n}`, name: n ? `測試觀眾 ${n}` : "測試觀眾" });
  await createFanSession(fan.id);
  return NextResponse.json({ fan: { name: fan.name, avatar: fan.avatarUrl } });
}
