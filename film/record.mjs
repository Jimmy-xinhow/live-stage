import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const dir = "/tmp/film-rec";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
  recordVideo: { dir, size: { width: 1920, height: 1080 } },
});
const p = await ctx.newPage();
await p.goto("file://" + resolve("film/film.html"), { waitUntil: "networkidle" });
// 字體與圖都要先備齊，否則開場會閃
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(1200);
await p.reload({ waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
const ms = await p.evaluate(() => window.FILM_MS);
await p.waitForTimeout(ms);
await ctx.close();
await b.close();

const vid = readdirSync(dir).find((f) => f.endsWith(".webm"));
execSync(`ffmpeg -y -loglevel error -i ${dir}/${vid} -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -movflags +faststart -r 30 ${process.argv[2] ?? "/tmp/anko-film.mp4"}`);
console.log("片長約", Math.round(ms / 1000), "秒");
