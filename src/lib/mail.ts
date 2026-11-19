import { APP_NAME, env } from "./env";
import { reportError } from "./errors";

/**
 * 寄信。
 *
 * 拿掉 LINE 之後，表演者端唯一的非同步通知管道就是信箱：登入驗證、重設密碼、
 * 方案到期。觀眾端完全不寄信——他們站在台前看畫面，不需要收信。
 *
 * 走 HTTP API 而不是 SMTP：雲端平台常常擋 25／465 埠，而且 SMTP 連線在
 * serverless 環境很容易卡住。目前支援 Resend，介面留著讓之後能換。
 *
 * 沒設定金鑰時不丟錯，改成印出來——開發與驗收環境照樣能走完流程，
 * 而 /admin/system 的上線前檢查會把「沒設定」講清楚。
 */
export type Mail = { to: string; subject: string; text: string };

export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

export async function sendMail(m: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    console.info(`[MAIL mock] ${m.to} / ${m.subject}`, JSON.stringify(m.text));
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, text: m.text }),
    });
    if (res.ok) return true;
    reportError("mail", new Error(`寄信失敗 ${res.status}`), { body: (await res.text()).slice(0, 300), to: m.to });
    return false;
  } catch (e) {
    reportError("mail", e, { to: m.to });
    return false;
  }
}

/** 信末固定帶著站名與網址，收件人才知道這封信從哪來 */
export const signature = () => `\n\n—\n${APP_NAME}　${env.baseUrl}`;
