import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { payQrImages, type PayMethod } from "./db/schema";

export const PAY_TYPE_LABEL: Record<PayMethod["type"], string> = { linepay: "LINE Pay", jkopay: "街口支付", pxpay: "全支付", other: "其他" };
export const PAY_TYPE_COLOR: Record<PayMethod["type"], string> = { linepay: "#06C755", jkopay: "#c8102e", pxpay: "#0a58ca", other: "#57534e" };

export type PublicPayMethod = { type: PayMethod["type"]; label: string; color: string; href: string | null; qrSvg: string | null; imageData: string | null };

/**
 * 給觀眾看的收款方式：網址型收款碼可直接點開，其餘顯示 QR 圖。
 *
 * 解不開的收款碼會留一張圖，那張圖存在另一張表——傳 performerId 進來才會去拿。
 * 不傳就只回文字型的，點歌頁用這一種，省掉每次都撈圖。
 */
export async function publicPayMethods(list: PayMethod[], performerId?: string): Promise<PublicPayMethod[]> {
  const needImages = performerId && list.some((m) => !m.qrText);
  const images = needImages ? await payImages(performerId!) : new Map<number, string>();
  return Promise.all(
    list.map(async (m, i) => ({
      type: m.type,
      label: m.label || PAY_TYPE_LABEL[m.type],
      color: PAY_TYPE_COLOR[m.type],
      href: m.qrText && /^https?:\/\//i.test(m.qrText) ? m.qrText : null,
      qrSvg: m.qrText ? await QRCode.toString(m.qrText, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : null,
      imageData: m.qrText ? null : (images.get(i) ?? m.imageData),
    })),
  );
}

/** 某位表演者的收款碼圖片，key 是在 payMethods 陣列裡的位置 */
export async function payImages(performerId: string) {
  const db = await getDb();
  const rows = await db.select().from(payQrImages).where(eq(payQrImages.performerId, performerId));
  return new Map(rows.map((r) => [r.idx, r.data]));
}

/** 存收款碼：圖片寫到另一張表，payMethods 裡只留文字 */
export async function savePayImages(performerId: string, list: PayMethod[]) {
  const db = await getDb();
  await db.delete(payQrImages).where(eq(payQrImages.performerId, performerId));
  const rows = list
    .map((m, idx) => ({ performerId, idx, data: m.qrText ? "" : (m.imageData ?? "") }))
    .filter((r) => r.data);
  if (rows.length) await db.insert(payQrImages).values(rows);
  return list.map((m) => ({ ...m, imageData: null }));
}

export const payMethodSummary = (list: PayMethod[]) => [...new Set(list.map((m) => m.label || PAY_TYPE_LABEL[m.type]))].join("／");
