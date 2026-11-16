import { requirePerformer } from "@/lib/auth";
import { inquiriesFor } from "@/lib/market";
import { InquiryList } from "./InquiryList";

export const dynamic = "force-dynamic";

export default async function Page() {
  const auth = await requirePerformer();
  if (!auth) return null;
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="h1">邀約</h1><p className="small">找表演的人送來的需求。回覆報價後，對方會在 LINE 收到；平台不抽成、不經手款項，之後由你們直接聯絡。</p></div>
      <InquiryList list={await inquiriesFor(auth.performer.id)} />
    </div>
  );
}
