import { formToObject, handleCallback } from "@/lib/pay-callback";
import { ackBody, type PayKind } from "@/lib/payments";

// 金流背景通知：綠界需回 1|OK，藍新回 200 即可
export async function POST(req: Request, { params }: { params: Promise<{ kind: string; tradeNo: string }> }) {
  const { kind, tradeNo } = await params;
  if (kind !== "order" && kind !== "points") return new Response("bad kind", { status: 404 });
  const r = await handleCallback(kind as PayKind, tradeNo, await formToObject(req));
  if (!r) return new Response("0|Verify Error", { status: 400 });
  return new Response(ackBody(r.creds.gateway), { headers: { "Content-Type": "text/plain" } });
}
