import { notFound } from "next/navigation";
import { getPerformerBySlug } from "@/lib/orders";
import { streamInfo } from "@/lib/acts";
import { chatEnabled } from "@/lib/chat";
import { Overlay } from "./Overlay";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** OBS 瀏覽器來源（1920×1080，背景透明）。網址帶表演者專屬碼，外流時可在後台重設 */
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ k?: string; preview?: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  const sp = await searchParams;
  if (!p || !p.overlayToken || sp.k !== p.overlayToken) notFound();
  const info = streamInfo(p.streamUrl);
  return <Overlay slug={p.slug} name={p.displayName} safe={!!info?.safe} preview={sp.preview === "1"} chatOn={chatEnabled() && info?.platform === "youtube"} />;
}
