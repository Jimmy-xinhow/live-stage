import { requireAccount } from "@/lib/auth";
import { AREAS } from "@/lib/areas";
import { OrgProfileForm } from "./OrgProfileForm";

export const dynamic = "force-dynamic";

export default async function OrgProfile() {
  const { performer: p } = (await requireAccount())!;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="h1">場地資料</h1><p className="small">會顯示在你刊登的每一場活動頁。</p></div>
      <OrgProfileForm
        initial={{ displayName: p.displayName, slug: p.slug, orgKind: p.orgKind as "venue", city: p.city ?? "kaohsiung", district: p.district, address: p.address, website: p.website, bio: p.bio, avatarUrl: p.avatarUrl ?? "" }}
        areas={AREAS.map((a) => ({ slug: a.slug, name: a.name }))}
      />
    </div>
  );
}
