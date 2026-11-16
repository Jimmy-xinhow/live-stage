import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

export type Session = { performerId: string | null; lineUserId: string; isAdmin: boolean };
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
    return { performerId: (payload.performerId as string) ?? null, lineUserId: payload.lineUserId as string, isAdmin: !!payload.isAdmin };
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

/** 粉絲（觀眾）身分：LINE 登入後發的 cookie，和藝人後台 session 分開 */
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
