/**
 * Next.js 在伺服器啟動時呼叫一次。
 * 這裡只做一件事：如果這個環境宣告自己在收真錢（LIVE_MODE=true），
 * 卻還開著開發後門，就讓啟動失敗。寧可部署掛掉也不要帶著後門收錢。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertLaunchable } = await import("./lib/preflight");
  assertLaunchable();
}
