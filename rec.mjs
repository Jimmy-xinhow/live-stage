import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

/** 錄一段畫面成 GIF。期間可以呼叫 API 觸發事件（例如按下轉盤） */
const [url, out, secs = "6", w = "1280", h = "720", trigger = ""] = process.argv.slice(2);
const dir = `/tmp/rec/${Date.now()}`;
mkdirSync(dir, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1,
  recordVideo: { dir, size: { width: +w, height: +h } } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
if (trigger) { setTimeout(() => { try { execSync(trigger, { stdio: "ignore" }); } catch {} }, 1500); }
await p.waitForTimeout(+secs * 1000);
await ctx.close();
await b.close();

const vid = readdirSync(dir).find((f) => f.endsWith(".webm"));
const fps = 15, width = Math.round(+w * 0.56);
execSync(`ffmpeg -y -loglevel error -i ${dir}/${vid} -vf "fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" ${out}`);
rmSync(dir, { recursive: true, force: true });
console.log(out, execSync(`du -h ${out} | cut -f1`).toString().trim());
