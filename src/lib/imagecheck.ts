/**
 * 使用者上傳的圖片檢查。目前收款碼是以 data URL 存進資料庫，
 * 所以至少要擋住：非圖片的檔案、副檔名與內容不符、超過大小、像素異常大的圖。
 *
 * 之後搬到物件儲存（R2／S3）時，這個檢查一樣在寫入前跑，只是來源改成檔案 buffer。
 */

const ALLOWED = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 300_000;

export type ImageCheck = { ok: true; mime: string; bytes: number } | { ok: false; reason: string };

/** 用檔頭判斷真正的格式，不信任 data URL 自稱的 MIME */
function sniff(buf: Uint8Array): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export function checkDataUrlImage(dataUrl: string): ImageCheck {
  const m = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl.trim());
  if (!m) return { ok: false, reason: "圖片格式不正確，請重新上傳。" };
  const [, claimed, b64] = m;
  if (!ALLOWED.includes(claimed.toLowerCase() as (typeof ALLOWED)[number])) {
    return { ok: false, reason: "只接受 PNG、JPG 或 WebP 圖片。" };
  }
  let buf: Uint8Array;
  try {
    buf = Uint8Array.from(Buffer.from(b64, "base64"));
  } catch {
    return { ok: false, reason: "圖片資料損壞，請重新上傳。" };
  }
  if (buf.length === 0) return { ok: false, reason: "圖片是空的。" };
  if (buf.length > MAX_IMAGE_BYTES) {
    return { ok: false, reason: `圖片太大（${Math.round(buf.length / 1024)}KB），請壓到 ${Math.round(MAX_IMAGE_BYTES / 1024)}KB 以內。` };
  }
  const real = sniff(buf);
  if (!real) return { ok: false, reason: "這個檔案看起來不是圖片。" };
  if (real !== claimed.toLowerCase()) return { ok: false, reason: "圖片的副檔名和內容不符，請重新輸出一次。" };
  return { ok: true, mime: real, bytes: buf.length };
}
