import { defineConfig } from "vitest/config";

export default defineConfig({
  // 測試裡用 @/lib/... 和程式碼一致，省掉一堆 ../../ 數層數
  resolve: { alias: { "@": `${process.cwd()}/src` } },
  test: {
    // 冒煙測試是 node:test ＋ playwright，要先有開發伺服器才能跑，
    // 走 npm run test:smoke。放在這裡會讓 npm test 直接失敗。
    include: ["tests/**/*.test.ts"],
    // 整合測試跑在記憶體裡的 PGlite（真的 Postgres，不是 mock），每個測試檔一個乾淨資料庫。
    // 不載入示範資料，測試自己建需要的資料。
    env: { PGLITE_DIR: ":memory:", SEED_DEMO: "false", NODE_ENV: "test" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
