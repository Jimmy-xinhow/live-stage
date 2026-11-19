/* eslint-disable @next/next/no-img-element */
import { requirePerformer } from "@/lib/auth";
import { CATEGORY_LABEL } from "@/lib/format";
import { APP_NAME } from "@/lib/env";
import { PrintButton } from "./PrintButton";
import { publicPayMethods } from "@/lib/paymethods";

export default async function Poster() {
  const p = (await requirePerformer())!.performer;
  const [pay] = await publicPayMethods(p.payMethods.slice(0, 1), p.id);
  return (
    <main className="mx-auto max-w-[148mm]">
      <div className="no-print mb-4 flex gap-2"><PrintButton /><a href="/dashboard" className="btn btn-secondary btn-sm">返回</a></div>
      <div className="flex flex-col rounded-[20px] border-2 border-[#151412] bg-[#fbfaf6] p-[10mm] text-[#151412]" style={{ aspectRatio: "148/210" }}>
        <div className="flex items-center justify-between text-[12px] font-medium tracking-[.08em]"><span>{p.district || CATEGORY_LABEL[p.category]}</span><span>{APP_NAME}</span></div>
        <div className="mt-[6mm] border-t-2 border-[#151412] pt-[5mm]">
          <div className="text-[34px] font-bold leading-[1.2]">{p.displayName}</div>
          <div className="mt-1 text-[17px]">掃碼看歌單。點了就排隊。</div>
        </div>
        <div className="mx-auto mt-[7mm] w-[78mm] rounded-[16px] border-2 border-[#151412] bg-white p-3">
          <img src={`/api/qr/${p.slug}?c=${encodeURIComponent("#151412")}`} alt="QR" className="w-full" />
        </div>
        <div className="mt-[6mm] flex items-start gap-3 text-[14px] leading-6">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#151412] text-[13px] font-bold text-[#fbfaf6]">1</span>
          <span><strong>掃上面的 QR</strong>，選歌、留言，拿到 4 碼點歌碼</span>
        </div>
        {pay && (
          <div className="mt-[4mm] flex items-center gap-3 text-[14px] leading-6">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full bg-[#151412] text-[13px] font-bold text-[#fbfaf6]">2</span>
            <span className="flex-1"><strong>用 {pay.label} 轉帳</strong>，備註填點歌碼。確認後就排進隊伍</span>
            <div className="w-[24mm] shrink-0 rounded-[8px] border border-[#d6d0c2] bg-white p-1">{pay.qrSvg ? <div dangerouslySetInnerHTML={{ __html: pay.qrSvg }} /> : pay.imageData ? <img src={pay.imageData} alt="" /> : null}</div>
          </div>
        )}
        <div className="mt-auto pt-[5mm] text-[11px] text-[#6b665c]">款項直接付給表演者，平台不經手。</div>
      </div>
    </main>
  );
}
