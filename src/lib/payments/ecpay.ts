import crypto from "node:crypto";

/** 依綠界 .NET UrlEncode 規則編碼（空白→+、~ 與 ' 需編碼），再轉小寫 */
export function ecpayUrlEncode(s: string): string {
  return encodeURIComponent(s).replace(/%20/g, "+").replace(/~/g, "%7e").replace(/'/g, "%27").toLowerCase();
}

export function checkMacValue(params: Record<string, string | number>, hashKey: string, hashIV: string): string {
  const joined = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0))
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha256").update(ecpayUrlEncode(`HashKey=${hashKey}&${joined}&HashIV=${hashIV}`)).digest("hex").toUpperCase();
}

export function verifyCheckMac(params: Record<string, string>, hashKey: string, hashIV: string): boolean {
  const given = params.CheckMacValue ?? "";
  const expected = checkMacValue(params, hashKey, hashIV);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** yyyy/MM/dd HH:mm:ss（台北時間） */
export function taipeiTimestamp(d = new Date()): string {
  const t = new Date(d.getTime() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}/${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}
