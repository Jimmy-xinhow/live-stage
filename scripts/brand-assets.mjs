import sharp from "sharp";
import { writeFileSync } from "node:fs";

const NIGHT = "#0d1117", SODIUM = "#ffb03a", BONE = "#f2efe9", DIM = "#9ba6b4", WASH = "#e8356d";

const markPaths = `
  <rect x="6.4" y="14.3" width="9.6" height="3.4" rx="1.7"/>
  <rect x="9.5" y="11.2" width="3.4" height="9.6" rx="1.7"/>
  <path d="M19.2 11.4h3.2v9.2h2.6v2.6h-7.8v-2.6h2.6v-6l-2.2 1.1-1-2.4 2.6-1.9Z"/>`;

const icon = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="9" fill="${SODIUM}"/><g fill="#15110a">${markPaths}</g></svg>`;

writeFileSync("public/icon.svg", icon(32));
for (const s of [32, 180, 192, 512]) {
  await sharp(Buffer.from(icon(s))).resize(s, s).png().toFile(`public/icon-${s}.png`);
}

// 分享卡：貼到 LINE、FB、IG 限動時會出現的那張圖
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="a" cx="18%" cy="0%" r="75%">
      <stop offset="0%" stop-color="${SODIUM}" stop-opacity=".30"/><stop offset="70%" stop-color="${SODIUM}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b" cx="92%" cy="12%" r="60%">
      <stop offset="0%" stop-color="${WASH}" stop-opacity=".22"/><stop offset="70%" stop-color="${WASH}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${NIGHT}"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <g transform="translate(88 92)">
    <g transform="scale(1.75)"><rect width="32" height="32" rx="9" fill="${SODIUM}"/><g fill="#15110a">${markPaths}</g></g>
    <text x="74" y="40" font-family="Noto Sans TC, sans-serif" font-size="38" font-weight="900" fill="${BONE}" letter-spacing="-1">安可</text>
  </g>
  <text x="88" y="296" font-family="Noto Sans TC, sans-serif" font-size="92" font-weight="900" fill="${BONE}" letter-spacing="-4">讓聽眾點歌給你</text>
  <text x="88" y="406" font-family="Noto Sans TC, sans-serif" font-size="92" font-weight="900" fill="${SODIUM}" letter-spacing="-4">錢直接進你的帳戶</text>
  <text x="88" y="486" font-family="Noto Sans TC, sans-serif" font-size="31" font-weight="500" fill="${DIM}">街頭・駐唱與樂團・線上直播　聽眾掃碼就能點，不用下載任何東西</text>
  <rect x="88" y="536" width="86" height="5" rx="2.5" fill="${SODIUM}"/>
</svg>`;
await sharp(Buffer.from(og)).png().toFile("public/og.png");
console.log("品牌圖檔完成");
