import crypto from "node:crypto";
import { env } from "./env";

type Msg = { type: "text"; text: string } | Record<string, unknown>;

async function call(path: string, body: unknown) {
  if (!env.line.messagingAccessToken) {
    console.info(`[LINE mock] ${path}`, JSON.stringify(body));
    return;
  }
  const res = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.line.messagingAccessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error(`[LINE] ${path} ${res.status}`, await res.text());
}

export const pushMessage = (to: string, messages: Msg[]) => call("push", { to, messages });
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

/** 一次推給多位（最多 500 人一批） */
export async function multicast(to: string[], messages: Msg[]) {
  for (let i = 0; i < to.length; i += 500) await call("multicast", { to: to.slice(i, i + 500), messages });
}
