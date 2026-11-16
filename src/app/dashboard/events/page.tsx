import { requirePerformer } from "@/lib/auth";
import { taggedEvents } from "@/lib/events";
import { TaggedEvents } from "./TaggedEvents";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requirePerformer();
  if (!auth) return null;
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="h1">被標記的活動</h1><p className="small">店家或主辦刊登活動時可以標記你。確認後才會公開顯示你的名字，也才會通知你的粉絲（費用由主辦負擔）。</p></div>
      <TaggedEvents list={await taggedEvents(auth.performer.id)} />
    </div>
  );
}
