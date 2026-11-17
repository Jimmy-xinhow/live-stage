import { chromium } from "playwright";
const url = process.argv[2] ?? "http://localhost:3000/";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const cs = getComputedStyle(document.body), h1 = document.querySelector("h1");
  const sizes = {}, lh = {}, radii = new Set(), pads = new Set(), gaps = new Set();
  document.querySelectorAll("h1,h2,h3,p,li,span,strong,a,div,button").forEach(e => {
    const s = getComputedStyle(e);
    if (e.textContent.trim() && !e.children.length) { sizes[s.fontSize] = (sizes[s.fontSize]||0)+1;
      if (e.tagName === "P") lh[(parseFloat(s.lineHeight)/parseFloat(s.fontSize)).toFixed(2)] = 1; }
    if (s.borderRadius !== "0px") radii.add(s.borderRadius);
    if (s.paddingTop !== "0px") pads.add(s.paddingTop);
    if (s.gap && s.gap !== "normal") gaps.add(s.gap);
  });
  let small = 0, total = 0, withT = 0;
  document.querySelectorAll("a,button").forEach(e => { const b = e.getBoundingClientRect();
    if (b.width && b.height) { total++; if (b.height < 44) small++; if (getComputedStyle(e).transitionDuration !== "0s") withT++; } });
  return { 內文: cs.fontSize, 主標: h1 && [getComputedStyle(h1).fontSize, getComputedStyle(h1).fontWeight, getComputedStyle(h1).fontFamily.split(",")[0]],
    字級種類: Object.keys(sizes).length, 字級: Object.keys(sizes).sort((a,b)=>parseFloat(a)-parseFloat(b)).join(" "),
    行高種類: Object.keys(lh).length, SVG圖示: document.querySelectorAll("svg").length, 圖片: document.querySelectorAll("img").length,
    圓角種類: radii.size, 內距種類: pads.size, gap種類: gaps.size,
    可點擊: total, 不足44px: small, 有過場: withT };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
