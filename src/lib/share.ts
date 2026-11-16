import { env, LIFF_ID } from "./env";

/** QR 優先指向 LIFF 網址：手機相機掃到會直接開 LINE，自動帶出身分，方便追蹤與通知 */
export function performerShareUrl(slug: string) {
  return LIFF_ID ? `https://liff.line.me/${LIFF_ID}/${encodeURIComponent(slug)}` : `${env.baseUrl}/p/${encodeURIComponent(slug)}`;
}
