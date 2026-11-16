import crypto from "node:crypto";

/** 藍新 MPG：TradeInfo = AES-256-CBC(query string) 轉 hex；TradeSha = SHA256(HashKey=..&TradeInfo&HashIV=..) 大寫 */
export function nwpEncrypt(data: string, hashKey: string, hashIV: string): string {
  // 比照藍新官方範例：以 32 bytes 為區塊做 PKCS7 補位
  const raw = Buffer.from(data, "utf8");
  const pad = 32 - (raw.length % 32);
  const padded = Buffer.concat([raw, Buffer.alloc(pad, pad)]);
  const c = crypto.createCipheriv("aes-256-cbc", Buffer.from(hashKey, "utf8"), Buffer.from(hashIV, "utf8"));
  c.setAutoPadding(false);
  return Buffer.concat([c.update(padded), c.final()]).toString("hex");
}

export function nwpDecrypt(hex: string, hashKey: string, hashIV: string): string {
  const d = crypto.createDecipheriv("aes-256-cbc", Buffer.from(hashKey, "utf8"), Buffer.from(hashIV, "utf8"));
  d.setAutoPadding(false);
  const buf = Buffer.concat([d.update(Buffer.from(hex, "hex")), d.final()]);
  // 藍新使用 PKCS7 補位，部分回傳帶有多餘空白字元，手動去除
  const pad = buf[buf.length - 1];
  const body = pad > 0 && pad <= 32 ? buf.subarray(0, buf.length - pad) : buf;
  return body.toString("utf8").replace(/[\x00-\x1f]+$/g, "").trim();
}

export function nwpTradeSha(tradeInfo: string, hashKey: string, hashIV: string): string {
  return crypto.createHash("sha256").update(`HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIV}`).digest("hex").toUpperCase();
}

export function nwpVerify(tradeInfo: string, tradeSha: string, hashKey: string, hashIV: string): boolean {
  const expected = nwpTradeSha(tradeInfo, hashKey, hashIV);
  return expected.length === tradeSha.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(tradeSha));
}
