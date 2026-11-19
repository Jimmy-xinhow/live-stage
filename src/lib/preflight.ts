import { env } from "./env";

/**
 * 上線前自我檢查。
 *
 * 要防的是同一件事：**用開發用的後門收真錢**。
 * 免 LINE 登入（DEV_LOGIN）、模擬付款（ECPAY_ALLOW_MOCK）、示範資料（SEED_DEMO）
 * 這三個在驗收時很好用，但只要金流切到正式，它們就變成「任何人都能冒用帳號」
 * 和「假付款也會進排隊」的洞。
 *
 * 檢查怎麼用：
 * - `LIVE_MODE=true` 代表這個環境在收真錢。此時出現任何 block 等級的問題，
 *   `assertLaunchable()` 會直接讓程式啟動失敗——寧可部署掛掉，也不要帶著後門收錢。
 * - 沒設 LIVE_MODE 時只記錄，不擋，並顯示在 /admin/system 上。
 */
export type Check = {
  key: string;
  level: "block" | "warn";
  ok: boolean;
  title: string;
  /** 沒過的話要做什麼 */
  fix: string;
};

const DEV_SESSION_SECRET = "dev-only-session-secret-change-me-32chars";
const DEV_ENCRYPTION_KEY = "dev-only-encryption-key-change-me";

export const liveMode = process.env.LIVE_MODE === "true";

export function preflight(): Check[] {
  const seed = process.env.SEED_DEMO ?? "";
  const g = env.platformGateway;

  return [
    {
      key: "dev_login",
      level: "block",
      ok: !env.allowDevLogin,
      title: "免 LINE 登入的後門已關閉",
      fix: "把 DEV_LOGIN 設成 false 或整個移除。開著等於任何人都能用網址直接登入示範帳號。",
    },
    {
      key: "mock_pay",
      level: "block",
      ok: !env.allowMock,
      title: "模擬付款已關閉",
      fix: "把 ECPAY_ALLOW_MOCK 設成 false。開著的話 /mock-pay 可以不付錢就把訂單標成已付款。",
    },
    {
      key: "seed_demo",
      level: "block",
      ok: seed !== "true" && seed !== "reset",
      title: "示範資料不會在啟動時寫入",
      fix: "把 SEED_DEMO 移除。設成 reset 更危險，它會重建示範資料。",
    },
    {
      key: "session_secret",
      level: "block",
      ok: env.sessionSecret !== DEV_SESSION_SECRET && env.sessionSecret.length >= 32,
      title: "工作階段金鑰已換成正式值",
      fix: "設定 SESSION_SECRET 為 32 字元以上的隨機字串。用預設值等於任何人都能偽造登入 Cookie。",
    },
    {
      key: "encryption_key",
      level: "block",
      ok: env.encryptionKey !== DEV_ENCRYPTION_KEY && env.encryptionKey.length >= 32,
      title: "加密金鑰已換成正式值",
      fix: "設定 APP_ENCRYPTION_KEY 為 32 字元以上的隨機字串。表演者的金流金鑰是用它加密的。",
    },
    {
      key: "admin_2fa",
      level: "block",
      ok: env.adminEmails.length > 0 && !env.adminPassword,
      title: "平台後台只能用帳號白名單進入",
      fix: "設定 ADMIN_EMAILS 並把 ADMIN_PASSWORD 移除。只靠一組共用密碼的後台等於單因素，而且離職了也收不回。",
    },
    {
      key: "base_url",
      level: "block",
      ok: env.baseUrl.startsWith("https://"),
      title: "站台網址是 https",
      fix: "把 APP_BASE_URL 設成正式網域的 https 位址。金流回呼與 LINE 登入都用它組網址。",
    },
    {
      key: "platform_gateway",
      level: "block",
      ok: g.gateway !== "mock" && !!g.merchantId && !!g.hashKey && !!g.hashIV,
      title: "平台自己的金流已接上（賣點數用）",
      fix: "設定 PLATFORM_GATEWAY 為 ecpay 或 newebpay，並填入商店代號與金鑰。不接的話表演者沒辦法儲值。",
    },
    {
      key: "payment_env",
      level: "block",
      ok: env.paymentEnv === "production",
      title: "金流環境是正式站",
      fix: "把 PAYMENT_ENV 設成 production。測試站的交易不會真的收到錢。",
    },
    {
      key: "mail",
      level: "block",
      ok: env.mail.configured,
      title: "寄信已設定",
      fix: "設定 RESEND_API_KEY 與 MAIL_FROM。沒有寄信，忘記密碼就沒有辦法把帳號還給任何人。",
    },
    {
      key: "admin_emails",
      level: "block",
      ok: env.adminEmails.length > 0,
      title: "平台管理員信箱白名單已設定",
      fix: "設定 ADMIN_EMAILS（逗號分隔）。沒設的話沒有人能用帳號進平台後台。",
    },
    {
      key: "support_email",
      level: "block",
      ok: !!process.env.SUPPORT_EMAIL,
      title: "客服信箱已設定",
      fix: "設定 SUPPORT_EMAIL。退款與爭議政策寫著「寄信給我們」，那個信箱必須真的存在。",
    },
    {
      key: "healthcheck",
      level: "warn",
      ok: !!process.env.HEALTHCHECK_NOTE,
      title: "外部監控已掛上 /api/health",
      fix: "用 UptimeRobot 之類的服務每分鐘打一次 /api/health，掛掉才會有人知道。設好之後把 HEALTHCHECK_NOTE 填上服務名稱當作記號。",
    },
    {
      key: "error_tracking",
      level: "warn",
      ok: !!process.env.SENTRY_DSN,
      title: "錯誤追蹤已設定",
      fix: "設定 SENTRY_DSN。沒設只會寫進 Railway log，發生錯誤時不會有人知道。",
    },
    {
      key: "migrate_on_boot",
      level: "warn",
      ok: process.env.MIGRATE_ON_BOOT !== "true",
      title: "啟動時不自動跑資料庫遷移",
      fix: "正式環境建議把 MIGRATE_ON_BOOT 關掉，改成部署流程裡手動跑一次，避免多實例同時遷移。",
    },
  ];
}

export function preflightSummary() {
  const checks = preflight();
  const blocking = checks.filter((c) => c.level === "block" && !c.ok);
  const warnings = checks.filter((c) => c.level === "warn" && !c.ok);
  return { checks, blocking, warnings, liveMode, launchable: blocking.length === 0 };
}

/**
 * 啟動時呼叫。LIVE_MODE=true 又有 block 等級的問題就直接丟錯，讓部署失敗。
 * 不是正式收錢的環境只記 log，驗收環境照樣能用模擬付款。
 */
export function assertLaunchable() {
  const { blocking, warnings } = preflightSummary();

  if (!liveMode) {
    if (blocking.length)
      console.log(
        JSON.stringify({
          at: "preflight",
          mode: "not-live",
          note: "這個環境不是正式收錢（沒有 LIVE_MODE=true），以下項目先不擋",
          items: blocking.map((c) => c.key),
        }),
      );
    return;
  }

  if (warnings.length)
    console.log(JSON.stringify({ at: "preflight", level: "warn", items: warnings.map((c) => c.key) }));

  if (blocking.length) {
    const lines = blocking.map((c, i) => `  ${i + 1}. ${c.title}：${c.fix}`).join("\n");
    throw new Error(
      `上線前檢查沒過，拒絕啟動。LIVE_MODE=true 代表這個環境要收真錢，` +
        `但下列項目會讓開發後門暴露在正式環境：\n${lines}\n` +
        `修好之後重新部署；如果這個環境其實不收真錢，把 LIVE_MODE 移除。`,
    );
  }

  console.log(JSON.stringify({ at: "preflight", mode: "live", result: "ok" }));
}
