import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

export type Session = { performerId: string | null; isAdmin: boolean; /** 簽發時間（秒）。改密碼之後用它讓舊 session 失效 */ issuedAt?: number };
const COOKIE = "ds_session";
const secret = () => new TextEncoder().encode(env.sessionSecret);

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 30 * 86400 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { performerId: (payload.performerId as string) ?? null, isAdmin: !!payload.isAdmin, issuedAt: payload.iat as number | undefined };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** 簽一次性的 OAuth state */
export async function signState(data: Record<string, string>) {
  return new SignJWT(data).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(secret());
}
export async function verifyState(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as Record<string, string>;
}

/** 觀眾身分：掃碼進來就發的 cookie，不需要登入，和表演者後台的 session 分開 */
const FAN_COOKIE = "ds_fan";
export async function createFanSession(fanId: string) {
  const token = await new SignJWT({ fanId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("180d").sign(secret());
  (await cookies()).set(FAN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 180 * 86400 });
}
export async function getFanId(): Promise<string | null> {
  const token = (await cookies()).get(FAN_COOKIE)?.value;
  if (!token) return null;
  try {
    return ((await jwtVerify(token, secret())).payload.fanId as string) ?? null;
  } catch {
    return null;
  }
}

/** 平台管理員：用管理密碼登入後發的 cookie，和表演者、觀眾的身分分開 */
const ADMIN_COOKIE = "ds_admin";
export async function createAdminSession() {
  const token = await new SignJWT({ admin: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 7 * 86400 });
}
export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
async function adminCookie() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    return !!(await jwtVerify(token, secret())).payload.admin;
  } catch {
    return false;
  }
}

/** 進管理後台的條件：用管理密碼登入，或 LINE 帳號在 ADMIN_LINE_USER_IDS 裡 */
export async function isAdmin() {
  if (await adminCookie()) return true;
  return !!(await getSession())?.isAdmin;
}

/** 稽核紀錄要記的操作者身分：用帳號登入的記 performerId，密碼登入的記 password */
export async function adminActor() {
  const s = await getSession();
  if (s?.isAdmin && s.performerId) return s.performerId;
  return (await adminCookie()) ? "password" : "unknown";
}

/**
 * 團員身分。
 *
 * 團員只是要看自己的拆帳數字，不該為此開一個帳號。用邀請碼認領一次，
 * 這台裝置就拿到一張簽章 cookie，之後直接看得到。
 */
const MEMBER_COOKIE = "ds_member";
export async function createMemberSession(memberIds: string[]) {
  const token = await new SignJWT({ memberIds }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("365d").sign(secret());
  (await cookies()).set(MEMBER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 365 * 86400 });
}
export async function getMemberIds(): Promise<string[]> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return [];
  try {
    const ids = (await jwtVerify(token, secret())).payload.memberIds;
    return Array.isArray(ids) ? (ids as string[]) : [];
  } catch {
    return [];
  }
}
