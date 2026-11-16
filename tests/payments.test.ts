import { describe, expect, it } from "vitest";
import { checkMacValue, ecpayUrlEncode, taipeiTimestamp } from "../src/lib/payments/ecpay";
import { nwpDecrypt, nwpEncrypt, nwpTradeSha } from "../src/lib/payments/newebpay";
import { buildCheckout, parseCallback, type Creds } from "../src/lib/payments";
import { encrypt, decrypt } from "../src/lib/crypto";
import { feeFor, canAcceptOrders } from "../src/lib/billing";

const EC: Creds = { gateway: "ecpay", merchantId: "3002607", hashKey: "pwFHCqoQZGmho4w6", hashIV: "EkRm7iFT261dpevs" };
const NW: Creds = { gateway: "newebpay", merchantId: "MS12345678", hashKey: "12345678901234567890123456789012", hashIV: "1234567890123456" };

describe("綠界", () => {
  it("CheckMacValue 符合官方文件範例", () => {
    const params = {
      TradeDesc: "促銷方案", PaymentType: "aio", MerchantTradeDate: "2023/03/12 15:30:23", MerchantTradeNo: "ecpay20230312153023",
      MerchantID: "3002607", ReturnURL: "https://www.ecpay.com.tw/receive.php", ItemName: "Apple iphone 15", TotalAmount: "30000", ChoosePayment: "ALL", EncryptType: "1",
    };
    expect(checkMacValue(params, EC.hashKey, EC.hashIV)).toBe("6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840");
  });
  it(".NET 編碼與台北時間", () => {
    expect(ecpayUrlEncode("a b-_.!*()~'")).toBe("a+b-_.!*()%7e%27");
    expect(taipeiTimestamp(new Date("2026-01-01T16:05:09Z"))).toBe("2026/01/02 00:05:09");
  });
  it("回傳驗證：正確通過、竄改失敗、商店代號不符失敗", () => {
    const p: Record<string, string> = { MerchantID: "3002607", MerchantTradeNo: "DSX1", RtnCode: "1", TradeAmt: "100", PaymentType: "Credit_CreditCard", TradeNo: "T1" };
    p.CheckMacValue = checkMacValue(p, EC.hashKey, EC.hashIV);
    expect(parseCallback(EC, p)).toMatchObject({ tradeNo: "DSX1", success: true, amount: 100 });
    expect(parseCallback(EC, { ...p, TradeAmt: "1000" })).toBeNull();
    expect(parseCallback({ ...EC, merchantId: "9999999" }, p)).toBeNull();
  });
});

describe("藍新", () => {
  it("AES-256-CBC 加解密互通（32 bytes 區塊補位）", () => {
    const s = "MerchantID=MS1&Amt=100&ItemDesc=點歌 晴天";
    const hex = nwpEncrypt(s, NW.hashKey, NW.hashIV);
    expect(hex.length % 64).toBe(0);
    expect(nwpDecrypt(hex, NW.hashKey, NW.hashIV)).toBe(s);
  });
  it("建單表單可被解回原參數", () => {
    const { fields, action } = buildCheckout(NW, { kind: "order", tradeNo: "DSABC", amount: 150, itemName: "點歌 家後", createdAt: new Date(), backPath: "/p/demo" });
    expect(action).toContain("ccore.newebpay.com");
    expect(fields.TradeSha).toBe(nwpTradeSha(fields.TradeInfo, NW.hashKey, NW.hashIV));
    const q = new URLSearchParams(nwpDecrypt(fields.TradeInfo, NW.hashKey, NW.hashIV));
    expect(q.get("MerchantOrderNo")).toBe("DSABC");
    expect(q.get("Amt")).toBe("150");
    expect(q.get("NotifyURL")).toContain("/api/pay/notify/order/DSABC");
  });
  it("付款通知：驗章、解密、商店代號比對", () => {
    const TradeInfo = nwpEncrypt(JSON.stringify({ Status: "SUCCESS", Result: { MerchantID: "MS12345678", Amt: 150, MerchantOrderNo: "DSABC", TradeNo: "N1", PaymentType: "CREDIT" } }), NW.hashKey, NW.hashIV);
    const TradeSha = nwpTradeSha(TradeInfo, NW.hashKey, NW.hashIV);
    expect(parseCallback(NW, { Status: "SUCCESS", TradeInfo, TradeSha })).toMatchObject({ tradeNo: "DSABC", success: true, amount: 150 });
    expect(parseCallback(NW, { Status: "SUCCESS", TradeInfo, TradeSha: "0".repeat(64) })).toBeNull();
  });
});

describe("計費與加密", () => {
  it("3% 服務費以分計算", () => {
    expect(feeFor(100)).toBe(300);
    expect(feeFor(150)).toBe(450);
    expect(feeFor(33)).toBe(99);
  });
  it("透支上限", () => {
    expect(canAcceptOrders(0)).toBe(true);
    expect(canAcceptOrders(-9999)).toBe(true);
    expect(canAcceptOrders(-10000)).toBe(false);
  });
  it("AES-GCM", () => {
    expect(decrypt(encrypt("pwFHCqoQZGmho4w6"))).toBe("pwFHCqoQZGmho4w6");
  });
});
