import { NextResponse } from "next/server";
import sharp from "sharp";
import { memoryCard } from "@/lib/card";

export const dynamic = "force-dynamic";

/** 點歌回憶卡：1080×1920 PNG，可以直接存起來分享 */
export async function GET(_: Request, { params }: { params: Promise<{ tradeNo: string }> }) {
  const card = await memoryCard((await params).tradeNo);
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const png = await sharp(Buffer.from(card.svg)).png().toBuffer();
    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "Content-Disposition": `inline; filename="card.png"` } });
  } catch {
    // 轉檔失敗（例如環境缺字型）時退回 SVG，一樣能看、能存
    return new NextResponse(card.svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
  }
}
