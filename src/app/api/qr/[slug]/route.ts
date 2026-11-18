import QRCode from "qrcode";
import { performerShareUrl } from "@/lib/share";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const u = new URL(req.url);
  const color = u.searchParams.get("c") ?? "#1f1a17";
  // ?f=png 給 canvas 用。瀏覽器可以把 SVG 畫進 canvas，但畫完就會污染畫布
  // 而無法 toDataURL 匯出，所以公告成圖那邊要的是 PNG。
  const wantPng = u.searchParams.get("f") === "png";
  if (wantPng) {
    const size = Math.min(1200, Math.max(200, Number(u.searchParams.get("s") ?? 640) || 640));
    const buf = await QRCode.toBuffer(performerShareUrl(slug), {
      type: "png", margin: 1, width: size, errorCorrectionLevel: "M",
      color: { dark: /^#[0-9a-f]{6}$/i.test(color) ? color : "#1f1a17", light: "#ffffff" },
    });
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
  }
  const svg = await QRCode.toString(performerShareUrl(slug), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: /^#[0-9a-f]{6}$/i.test(color) ? color : "#1f1a17", light: "#ffffff" },
  });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
