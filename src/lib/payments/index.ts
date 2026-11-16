import { env } from "../env";
import { decrypt } from "../crypto";
import type { Performer } from "../db/schema";
import { checkMacValue, taipeiTimestamp, verifyCheckMac } from "./ecpay";
import { nwpDecrypt, nwpEncrypt, nwpTradeSha, nwpVerify } from "./newebpay";

export type Gateway = "ecpay" | "newebpay";
export type Creds = { gateway: Gateway; merchantId: string; hashKey: string; hashIV: string };
export type PayKind = "order" | "points";

export const GATEWAY_LABEL: Record<string, string> = { none: "未開通", mock: "模擬刷卡（測試）", ecpay: "綠界 ECPay", newebpay: "藍新 NewebPay" };

/** 藝人自己的金流憑證（金鑰以 AES-256-GCM 加密儲存） */
export function performerCreds(p: Performer): Creds | null {
  if ((p.gateway !== "ecpay" && p.gateway !== "newebpay") || !p.gatewayMerchantId || !p.gatewayHashKeyEnc || !p.gatewayHashIvEnc) return null;
  return { gateway: p.gateway, merchantId: p.gatewayMerchantId, hashKey: decrypt(p.gatewayHashKeyEnc), hashIV: decrypt(p.gatewayHashIvEnc) };
}

/** 平台自己的收款帳號，只用於賣點數 */
export function platformCreds(): Creds | null {
  const g = env.platformGateway;
  if (g.gateway === "mock" || !g.merchantId) return null;
  return { gateway: g.gateway, merchantId: g.merchantId, hashKey: g.hashKey, hashIV: g.hashIV };
}

const prod = () => env.paymentEnv === "production";
const clean = (s: string) => s.replace(/[#<>"'&=]/g, "").slice(0, 50);

export type CheckoutInput = { kind: PayKind; tradeNo: string; amount: number; itemName: string; createdAt: Date; backPath: string };

/** 組付款表單，由前端以 form POST 導轉（兩家都不允許 iframe） */
export function buildCheckout(c: Creds, o: CheckoutInput): { action: string; fields: Record<string, string> } {
  const notifyUrl = `${env.baseUrl}/api/pay/notify/${o.kind}/${o.tradeNo}`;
  const returnUrl = `${env.baseUrl}/api/pay/return/${o.kind}/${o.tradeNo}`;
  const backUrl = `${env.baseUrl}${o.backPath}`;

  if (c.gateway === "ecpay") {
    const f: Record<string, string> = {
      MerchantID: c.merchantId,
      MerchantTradeNo: o.tradeNo,
      MerchantTradeDate: taipeiTimestamp(o.createdAt),
      PaymentType: "aio",
      TotalAmount: String(o.amount),
      TradeDesc: "order",
      ItemName: clean(o.itemName),
      ReturnURL: notifyUrl,
      OrderResultURL: returnUrl,
      ClientBackURL: backUrl,
      ChoosePayment: "ALL",
      // 只開即時到帳：信用卡、Apple Pay、TWQR
      IgnorePayment: "WebATM#ATM#CVS#BARCODE#BNPL",
      EncryptType: "1",
    };
    f.CheckMacValue = checkMacValue(f, c.hashKey, c.hashIV);
    return {
      action: prod() ? "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5" : "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
      fields: f,
    };
  }

  const info = new URLSearchParams({
    MerchantID: c.merchantId,
    RespondType: "JSON",
    TimeStamp: String(Math.floor(o.createdAt.getTime() / 1000)),
    Version: "2.0",
    MerchantOrderNo: o.tradeNo,
    Amt: String(o.amount),
    ItemDesc: clean(o.itemName),
    NotifyURL: notifyUrl,
    ReturnURL: returnUrl,
    ClientBackURL: backUrl,
    LoginType: "0",
    // 只開即時到帳（需在藍新後台開通對應項目）
    CREDIT: "1",
    APPLEPAY: "1",
    LINEPAY: "1",
    TAIWANPAY: "1",
  }).toString();
  const TradeInfo = nwpEncrypt(info, c.hashKey, c.hashIV);
  return {
    action: prod() ? "https://core.newebpay.com/MPG/mpg_gateway" : "https://ccore.newebpay.com/MPG/mpg_gateway",
    fields: { MerchantID: c.merchantId, TradeInfo, TradeSha: nwpTradeSha(TradeInfo, c.hashKey, c.hashIV), Version: "2.0" },
  };
}

export type PayResult = { tradeNo: string; success: boolean; amount: number; paymentType: string; gatewayTradeNo: string; simulated: boolean; raw: unknown };

/** 驗證並解析金流回傳。驗證失敗回傳 null */
export function parseCallback(c: Creds, params: Record<string, string>): PayResult | null {
  if (c.gateway === "ecpay") {
    if (!verifyCheckMac(params, c.hashKey, c.hashIV) || params.MerchantID !== c.merchantId) return null;
    return {
      tradeNo: params.MerchantTradeNo,
      success: params.RtnCode === "1",
      amount: Number(params.TradeAmt),
      paymentType: params.PaymentType ?? "",
      gatewayTradeNo: params.TradeNo ?? "",
      simulated: params.SimulatePaid === "1",
      raw: params,
    };
  }
  if (!params.TradeInfo || !params.TradeSha || !nwpVerify(params.TradeInfo, params.TradeSha, c.hashKey, c.hashIV)) return null;
  let j: { Status: string; Result?: Record<string, string | number> };
  try {
    j = JSON.parse(nwpDecrypt(params.TradeInfo, c.hashKey, c.hashIV));
  } catch {
    return null;
  }
  const r = j.Result ?? {};
  if (String(r.MerchantID) !== c.merchantId) return null;
  return {
    tradeNo: String(r.MerchantOrderNo ?? ""),
    success: j.Status === "SUCCESS",
    amount: Number(r.Amt),
    paymentType: String(r.PaymentType ?? ""),
    gatewayTradeNo: String(r.TradeNo ?? ""),
    simulated: false,
    raw: { Status: j.Status, Result: r },
  };
}

/** 金流要求的回應字串 */
export const ackBody = (g: Gateway) => (g === "ecpay" ? "1|OK" : "OK");
