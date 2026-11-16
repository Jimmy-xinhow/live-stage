import { requirePerformer } from "@/lib/auth";
import { env } from "@/lib/env";
import { chatEnabled } from "@/lib/chat";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requirePerformer();
  if (!auth) return null;
  const p = auth.performer;
  return (
    <ProfileForm
      slug={p.slug} baseUrl={env.baseUrl} city={p.city}
      init={{ actType: p.actType, bio: p.bio, genres: p.genres, bookable: p.bookable, priceFrom: p.priceFrom, occasions: p.occasions, serviceAreas: p.serviceAreas, lat: p.lat ?? "", lng: p.lng ?? "", coverUrl: p.coverUrl ?? "", videoUrl: p.videoUrl ?? "", streamUrl: p.streamUrl ?? "" }}
      overlayToken={p.overlayToken}
      chatEnabled={chatEnabled()}
    />
  );
}
