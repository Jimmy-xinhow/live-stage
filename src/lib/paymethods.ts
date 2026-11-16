import QRCode from "qrcode";
import type { PayMethod } from "./db/schema";

export const PAY_TYPE_LABEL: Record<PayMethod["type"], string> = { linepay: "LINE Pay", jkopay: "街口支付", pxpay: "全支付", other: "其他" };
export const PAY_TYPE_COLOR: Record<PayMethod["type"], string> = { linepay: "#06C755", jkopay: "#c8102e", pxpay: "#0a58ca", other: "#57534e" };

export type PublicPayMethod = { type: PayMethod["type"]; label: string; color: string; href: string | null; qrSvg: string | null; imageData: string | null };

/** 給觀眾看的收款方式：網址型收款碼可直接點開，其餘顯示 QR 圖 */
export async function publicPayMethods(list: PayMethod[]): Promise<PublicPayMethod[]> {
  return Promise.all(
    list.map(async (m) => ({
      type: m.type,
      label: m.label || PAY_TYPE_LABEL[m.type],
      color: PAY_TYPE_COLOR[m.type],
      href: m.qrText && /^https?:\/\//i.test(m.qrText) ? m.qrText : null,
      qrSvg: m.qrText ? await QRCode.toString(m.qrText, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : null,
      imageData: m.qrText ? null : m.imageData,
    })),
  );
}

export const payMethodSummary = (list: PayMethod[]) => [...new Set(list.map((m) => m.label || PAY_TYPE_LABEL[m.type]))].join("／");
