/**
 * 錯誤回報。預設寫結構化的 server log（Railway 會收走），
 * 另外設定 SENTRY_DSN 的話，就用 Sentry 的 store endpoint 送一份出去——
 * 不裝 SDK 是為了不增加 bundle 體積，欄位夠用就好。
 */

type Ctx = Record<string, string | number | boolean | null | undefined>;

const dsn = process.env.SENTRY_DSN ?? "";
let parsed: { url: string; key: string } | null = null;
if (dsn) {
  try {
    const u = new URL(dsn);
    parsed = { url: `${u.protocol}//${u.host}/api${u.pathname}/store/`, key: u.username };
  } catch {
    console.error("[errors] SENTRY_DSN 格式不正確，略過");
  }
}

export function reportError(where: string, err: unknown, ctx: Ctx = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  // 結構化輸出，方便在 Railway 的 log 搜尋
  console.error(JSON.stringify({
    level: "error",
    at: new Date().toISOString(),
    where,
    message: e.message,
    stack: e.stack?.split("\n").slice(0, 8).join("\n"),
    ...ctx,
  }));
  if (!parsed) return;
  // 失敗就算了，不要讓回報本身拖垮請求
  void fetch(parsed.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=live-stage/1.0`,
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      platform: "node",
      environment: process.env.NODE_ENV,
      level: "error",
      logger: where,
      message: e.message,
      exception: { values: [{ type: e.name, value: e.message }] },
      extra: ctx,
    }),
  }).catch(() => {});
}

/** 包住背景工作：出錯只記錄，不往外丟 */
export async function quiet<T>(where: string, fn: () => Promise<T>, ctx: Ctx = {}): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    reportError(where, e, ctx);
    return null;
  }
}
