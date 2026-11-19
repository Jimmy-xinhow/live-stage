import { env } from "./env";

/**
 * QR 與分享連結指向的網址。
 *
 * 就是一般網頁，沒有中介。手機相機掃到直接開瀏覽器，不用裝任何東西、
 * 不用登入、不用加好友——這是這套系統對觀眾唯一的要求：掃一下。
 */
export function performerShareUrl(slug: string) {
  return `${env.baseUrl}/p/${encodeURIComponent(slug)}`;
}
