import { notFound } from "next/navigation";
import { getPerformerBySlug, publicState } from "@/lib/orders";
import { LiveBoard } from "./LiveBoard";
import { APP_NAME } from "@/lib/env";
import { chatEnabled } from "@/lib/chat";
import { streamInfo } from "@/lib/acts";

export const dynamic = "force-dynamic";

export default async function Live({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) notFound();
  return <LiveBoard slug={p.slug} name={p.displayName} color={p.themeColor} avatar={p.avatarUrl} appName={APP_NAME} initial={await publicState(p)} chatOn={chatEnabled() && streamInfo(p.streamUrl)?.platform === "youtube"} />;
}
