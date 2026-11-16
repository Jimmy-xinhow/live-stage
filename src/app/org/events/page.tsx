import { requireAccount } from "@/lib/auth";
import { myEvents } from "@/lib/events";
import { AREAS } from "@/lib/areas";
import { EventManager } from "./EventManager";

export const dynamic = "force-dynamic";

export default async function OrgEvents() {
  const { performer: p } = (await requireAccount())!;
  const list = await myEvents(p.id);
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="h1">我的活動</h1><p className="small">標記平台上的表演者後，對方確認才會公開顯示；勾選通知粉絲時，確認的當下會用你的點數發送。</p></div>
      <EventManager
        defaultCity={p.city ?? "kaohsiung"}
        defaultPlace={p.district || p.displayName}
        areas={AREAS.map((a) => ({ slug: a.slug, name: a.name }))}
        list={list.map((e) => ({
          id: e.id, title: e.title, city: e.city, place: e.place, address: e.address, startsAt: e.startsAt, endsAt: e.endsAt, description: e.description,
          priceText: e.priceText, link: e.link, coverUrl: e.coverUrl ?? "", guestActs: e.guestActs, notifyFans: e.notifyFans, status: e.status, lat: e.lat ?? "", lng: e.lng ?? "",
          tags: e.tags.map((t) => ({ slug: t.slug, name: t.name, status: t.status })),
        }))}
      />
    </div>
  );
}
