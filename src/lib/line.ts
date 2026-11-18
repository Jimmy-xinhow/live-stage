import crypto from "node:crypto";
import { env } from "./env";
import { reportError } from "./errors";
import { enqueue, record } from "./linequota";

type Msg = { type: "text"; text: string } | Record<string, unknown>;

async function call(path: string, body: unknown) {
  if (!env.line.messagingAccessToken) {
    console.info(`[LINE mock] ${path}`, JSON.stringify(body));
    return { ok: true, status: 0, text: "" };
  }
  const res = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.line.messagingAccessToken}` },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false, status: 0, text: "連不上 LINE" };
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    reportError("line", new Error(`[LINE] ${path} ${res.status}`), { body: text });
    return { ok: false, status: res.status, text };
  }
  return { ok: true, status: res.status, text: "" };
}

/**
 * 推播一位。失敗時排進重送佇列，不是寫完 log 就算了——
 * 開演通知推不出去，表演者就少了一場的人。
 *
 * 4xx 多半是對方封鎖了官方帳號或 userId 失效，重送沒有意義，直接記下來。
 */
export async function pushMessage(to: string, messages: Msg[], kind = "other", performerId?: string | null) {
  const r = await call("push", { to, messages });
  if (r.ok) {
    await record(1).catch(() => {});
    return true;
  }
  const permanent = r.status >= 400 && r.status < 500;
  await record(0, 1).catch(() => {});
  if (!permanent) await enqueue([to], messages, kind, performerId, r.text).catch(() => {});
  return false;
}

export const replyMessage = (replyToken: string, messages: Msg[]) => call("reply", { replyToken, messages });

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.line.messagingChannelSecret) return false;
  const expected = crypto.createHmac("sha256", env.line.messagingChannelSecret).update(rawBody).digest("base64");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export type LineProfile = { userId: string; name: string; picture?: string };

/** 伺服器端驗證 LIFF / LINE Login 的 ID token，不信任前端傳來的 userId */
export async function verifyIdToken(idToken: string): Promise<LineProfile | null> {
  if (!env.line.loginChannelId) return null;
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: env.line.loginChannelId }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { sub: string; name?: string; picture?: string };
  return { userId: j.sub, name: j.name ?? "", picture: j.picture };
}

export function loginAuthorizeUrl(state: string, nonce: string) {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: env.line.loginChannelId,
    redirect_uri: `${env.baseUrl}/api/auth/line/callback`,
    state,
    scope: "profile openid",
    nonce,
    bot_prompt: "aggressive", // 登入時一併邀請加入官方帳號好友，才能收到打賞通知
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${q}`;
}

export async function exchangeCode(code: string): Promise<{ id_token: string } | null> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.baseUrl}/api/auth/line/callback`,
      client_id: env.line.loginChannelId,
      client_secret: env.line.loginChannelSecret,
    }),
  });
  return res.ok ? ((await res.json()) as { id_token: string }) : null;
}

/**
 * 一次推給多位（LINE 一批最多 500 人）。
 * 整批失敗時，把這一批的每一位分開排進重送佇列——
 * 下次重送是一人一則，才不會因為其中一位失效就全批重來。
 */
export async function multicast(to: string[], messages: Msg[], kind = "other", performerId?: string | null) {
  let sent = 0, failed = 0;
  for (let i = 0; i < to.length; i += 500) {
    const batch = to.slice(i, i + 500);
    const r = await call("multicast", { to: batch, messages });
    if (r.ok) { sent += batch.length; continue; }
    failed += batch.length;
    const permanent = r.status >= 400 && r.status < 500;
    if (!permanent) await enqueue(batch, messages, kind, performerId, r.text).catch(() => {});
  }
  await record(sent, failed).catch(() => {});
  return { sent, failed };
}
