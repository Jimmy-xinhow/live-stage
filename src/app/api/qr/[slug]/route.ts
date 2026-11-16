import QRCode from "qrcode";
import { performerShareUrl } from "@/lib/share";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const color = new URL(req.url).searchParams.get("c") ?? "#1f1a17";
  const svg = await QRCode.toString(performerShareUrl(slug), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: /^#[0-9a-f]{6}$/i.test(color) ? color : "#1f1a17", light: "#ffffff" },
  });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
