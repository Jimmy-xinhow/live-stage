import crypto from "node:crypto";

/**
 * 密碼雜湊。
 *
 * 用 Node 內建的 scrypt，不另外裝套件——少一個相依就少一個供應鏈風險，
 * 而 scrypt 本來就是為了抵抗硬體暴力破解設計的（記憶體成本高）。
 *
 * 儲存格式：scrypt$N$r$p$鹽$雜湊，全部 base64url。
 * 參數寫在字串裡，之後要調高成本也能認得舊的雜湊。
 */
const N = 16384; // CPU／記憶體成本
const R = 8;
const P = 1;
const KEYLEN = 32;

const b64 = (b: Buffer) => b.toString("base64url");

export function hashPassword(plain: string): Promise<string> {
  return new Promise((res, rej) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(plain.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (e, key) => {
      if (e) return rej(e);
      res(`scrypt$${N}$${R}$${P}$${b64(salt)}$${b64(key)}`);
    });
  });
}

/** 比對。永遠用定時比較，避免從回應時間反推出雜湊 */
export function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  return new Promise((res) => {
    if (!stored) return res(false);
    const [tag, n, r, p, salt, key] = stored.split("$");
    if (tag !== "scrypt") return res(false);
    const expected = Buffer.from(key, "base64url");
    crypto.scrypt(
      plain.normalize("NFKC"),
      Buffer.from(salt, "base64url"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 },
      (e, got) => {
        if (e) return res(false);
        res(got.length === expected.length && crypto.timingSafeEqual(got, expected));
      },
    );
  });
}

/** 這個雜湊是不是用比現在更低的成本算的，登入成功時可以順手升級 */
export const needsRehash = (stored: string | null) => {
  if (!stored) return false;
  const [tag, n] = stored.split("$");
  return tag === "scrypt" && Number(n) < N;
};

/**
 * 密碼強度。不做那種「必須有大寫、數字、符號」的規則——
 * 那只會逼出 Password1! 這種好猜又難記的密碼。長度才是真正有效的門檻。
 */
export function checkPassword(plain: string): string | null {
  const s = plain.normalize("NFKC");
  if (s.length < 10) return "密碼至少要 10 個字。長一點比複雜更安全，用一句你記得住的話就好。";
  if (s.length > 200) return "密碼太長了。";
  if (/^(.)\1+$/.test(s)) return "整串都是同一個字，太好猜了。";
  const weak = ["password", "12345678", "qwerty", "11111111", "abc123456", "letmein", "iloveyou"];
  if (weak.some((w) => s.toLowerCase().includes(w))) return "這組密碼在外流字典裡很常見，換一組。";
  return null;
}

/** 一次性權杖：給使用者的是原始值，資料庫只存雜湊 */
export function newToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: crypto.createHash("sha256").update(raw).digest("hex") };
}
export const hashToken = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");
