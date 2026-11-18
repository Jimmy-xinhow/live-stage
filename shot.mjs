import { chromium } from "playwright";
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 1600 }, deviceScaleFactor: 1 });
for (const [p, f] of [["/terms","terms"],["/privacy","privacy"],["/refund","refund"]]) {
  await pg.goto("http://127.0.0.1:3000"+p, { waitUntil: "networkidle" });
  await pg.screenshot({ path: `/tmp/${f}.png` });
}
await pg.setViewportSize({ width: 390, height: 1400 });
await pg.goto("http://127.0.0.1:3000/terms", { waitUntil: "networkidle" });
await pg.screenshot({ path: "/tmp/terms-m.png" });
await b.close();
