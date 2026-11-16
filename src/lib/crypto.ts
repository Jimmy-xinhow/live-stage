import crypto from "node:crypto";
import { env } from "./env";

const key = () => crypto.createHash("sha256").update(env.encryptionKey).digest();

/** AES-256-GCM，用來加密藝人的綠界 HashKey/HashIV */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(enc: string): string {
  const [iv, tag, ct] = enc.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
