import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";
import { runPlanRenewals } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * 每小時的整理工作。用 CRON_SECRET 保護，排程服務帶 Authorization: Bearer <secret> 呼叫。
 * 沒設定 CRON_SECRET 就不開放，避免正式環境忘了設而被任意觸發。
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return NextResponse.json({ error: "cron 未啟用（沒有設定 CRON_SECRET）" }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const result = await runMaintenance();
  // 方案到期：能續的從點數續一期，不能續的降回免費並通知
  const plans = await runPlanRenewals();
  return NextResponse.json({ ok: true, at: new Date().toISOString(), ...result, plans });
}

export const GET = POST;
