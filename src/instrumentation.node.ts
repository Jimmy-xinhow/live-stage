/**
 * 啟動時只在 Node 執行環境跑的事。
 * 分成獨立檔案是因為 instrumentation.ts 連 edge 環境也會打包，
 * 而這裡面的東西（資料庫、檔案系統）在 edge 不存在。
 */
export async function boot() {
  // 1. 這個環境宣告自己在收真錢卻還開著開發後門，就讓啟動失敗。
  //    寧可部署掛掉，也不要帶著後門收錢。
  const { assertLaunchable } = await import("./lib/preflight");
  assertLaunchable();

  // 2. 內建排程：逾時訂單、方案續期、資料清理。少一個外部相依，
  //    就少一件會忘記設定、而且沒有人會發現的事。
  const { startScheduler } = await import("./lib/scheduler");
  startScheduler();
}
