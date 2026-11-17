import { requirePerformer } from "@/lib/auth";
import { inquiriesFor } from "@/lib/market";
import { InquiryList } from "./InquiryList";
import { Empty, PageHead, Section } from "@/components/back/Shell";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (!FEATURES.matching) notFound();
  const auth = await requirePerformer();
  if (!auth) return null;
  return (
    <div className="flex flex-col gap-5">
      <PageHead title="邀約" desc={<>找表演的人送來的需求。回覆報價後，對方會在 LINE 收到；平台不抽成、不經手款項，之後由你們直接聯絡。</>} />
      <InquiryList list={await inquiriesFor(auth.performer.id)} />
    </div>
  );
}
