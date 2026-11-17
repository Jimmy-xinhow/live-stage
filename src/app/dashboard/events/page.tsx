import { requirePerformer } from "@/lib/auth";
import { taggedEvents } from "@/lib/events";
import { TaggedEvents } from "./TaggedEvents";
import { Empty, PageHead, Section } from "@/components/back/Shell";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requirePerformer();
  if (!auth) return null;
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="被標記的活動" desc={<>店家或主辦刊登活動時可以標記你。確認後才會公開顯示你的名字，也才會通知你的粉絲（費用由主辦負擔）。</>} />
      <TaggedEvents list={await taggedEvents(auth.performer.id)} />
    </div>
  );
}
