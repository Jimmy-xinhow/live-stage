/** Next.js 在伺服器啟動時呼叫一次 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { boot } = await import("./instrumentation.node");
    await boot();
  }
}
