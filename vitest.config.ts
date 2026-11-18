import { defineConfig } from "vitest/config";

export default defineConfig({
  // 測試裡用 @/lib/... 和程式碼一致，省掉一堆 ../../ 數層數
  resolve: { alias: { "@": `${process.cwd()}/src` } },
  test: {
    // 冒煙測試是 node:test ＋ playwright，要先有開發伺服器才能跑，
    // 走 npm run test:smoke。放在這裡會讓 npm test 直接失敗。
    include: ["tests/**/*.test.ts"],
  },
});
