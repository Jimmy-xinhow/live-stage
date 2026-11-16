import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb } from "./db";
import { orders, performers } from "./db/schema";
import { displayName } from "./orders";
import { APP_NAME, env } from "./env";
import { areaBySlug } from "./areas";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
/** 粗略估算中文寬度，讓長歌名自動換行 */
function wrap(text: string, perLine: number, max = 3) {
  const out: string[] = [];
  let line = "";
  let w = 0;
  for (const ch of text) {
    const cw = /[\x00-\xff]/.test(ch) ? 0.55 : 1;
    if (w + cw > perLine) { out.push(line); line = ""; w = 0; if (out.length >= max) break; }
    line += ch;
    w += cw;
  }
  if (line && out.length < max) out.push(line);
  return out;
}

/** 點歌回憶卡：1080×1920 的分享圖，用「演出刊物」的紙色與墨色 */
export async function memoryCard(tradeNo: string) {
  const db = await getDb();
  const [row] = await db.select({ o: orders, p: performers }).from(orders).innerJoin(performers, eq(performers.id, orders.performerId)).where(eq(orders.tradeNo, tradeNo));
  if (!row || row.o.status !== "paid") return null;
  const { o, p } = row;
  const when = new Date(o.paidAt ?? o.createdAt).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric" });
  const where = [areaBySlug(p.city)?.short, p.district].filter(Boolean).join("・");
  const title = o.itemTitle ? `〈${o.itemTitle}〉` : "打賞";
  const lines = wrap(title, 9, 3);
  const qr = await QRCode.toString(`${env.baseUrl}/u/${p.slug}`, { type: "svg", margin: 0, color: { dark: "#151412", light: "#F4F1EA" } });
  // 取出 QR 的內容並換算縮放：viewBox 的格數每次不同
  const modules = Number(qr.match(/viewBox="0 0 (\d+)/)?.[1] ?? 25);
  const qrInner = qr.replace(/^<\?xml[\s\S]*?\?>/, "").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "");
  const msg = o.message ? wrap(o.message, 17, 2) : [];

  const top = 820 - (lines.length - 1) * 70;
  const afterTitle = top + lines.length * 132;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" font-family="Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif">
  <rect width="1080" height="1920" fill="#F4F1EA"/>
  <rect x="56" y="56" width="968" height="1808" fill="none" stroke="#151412" stroke-width="4"/>
  <text x="120" y="208" font-size="32" letter-spacing="4" fill="#6B665C">${esc(when)}</text>
  <text x="960" y="208" font-size="32" letter-spacing="4" fill="#6B665C" text-anchor="end">${esc(where || "現場")}</text>
  <line x1="120" y1="248" x2="960" y2="248" stroke="#151412" stroke-width="3"/>

  <text x="120" y="${top - 132}" font-size="40" letter-spacing="2" fill="#B23A10">${o.itemTitle ? "我在現場點了這首" : "我在現場支持了"}</text>
  ${lines.map((l, i) => `<text x="120" y="${top + i * 132}" font-size="112" font-weight="700" fill="#151412">${esc(l)}</text>`).join("\n  ")}
  <text x="120" y="${afterTitle + 24}" font-size="44" fill="#4B4740">${esc(p.displayName)}</text>
  ${msg.length
    ? `<line x1="120" y1="${afterTitle + 104}" x2="520" y2="${afterTitle + 104}" stroke="#D6D0C2" stroke-width="3"/>
  ${msg.map((l, i) => `<text x="120" y="${afterTitle + 190 + i * 62}" font-size="42" fill="#4B4740">${esc(l)}</text>`).join("\n  ")}`
    : ""}

  <line x1="120" y1="1452" x2="960" y2="1452" stroke="#D6D0C2" stroke-width="3"/>
  <text x="120" y="1536" font-size="30" letter-spacing="4" fill="#6B665C">點播</text>
  <text x="120" y="1596" font-size="44" font-weight="700" fill="#151412">${esc(displayName(o))}</text>
  <text x="120" y="1664" font-size="30" fill="#6B665C">掃碼看演出紀錄、行程與邀約</text>
  <g transform="translate(748, 1476) scale(${(212 / modules).toFixed(4)})">${qrInner}</g>
  <text x="120" y="1790" font-size="28" letter-spacing="8" fill="#6B665C">${esc(APP_NAME)}</text>
</svg>`;
  return { svg, name: `${p.displayName}-${o.itemTitle ?? "支持"}` };
}
