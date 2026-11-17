import { matchData } from "@/lib/admin";
import { ReviewActions } from "./ReviewActions";
import { Out, Table, Tag, When } from "../Bits";
import { PageHead } from "@/components/back/Shell";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function Match() {
  if (!FEATURES.matching) notFound();
  const { inquiries, reviews } = await matchData();
  const sent = inquiries.reduce((a, i) => a + i.targets, 0);
  const replied = inquiries.reduce((a, i) => a + i.replied, 0);
  return (
    <div className="flex flex-col gap-8">
      <PageHead title="邀約與評價" desc={<>平台只轉達需求與報價，不經手演出費。最近 {inquiries.length} 筆邀約共送給 {sent} 位表演者，已回覆 {replied} 次{sent ? `（${Math.round((replied / sent) * 100)}%）` : ""}。</>} />

      <section className="sec">
        <h2 className="h2">邀約</h2>
        <Table
          head={["送出時間", "找表演的人", "場合", "日期", "地區", "預算", "送給", "已回覆", "有報價"]}
          right={[5,6,7,8]}
          rows={inquiries.map((i) => [
            <When key="w" v={i.at} />, i.by, i.occasion, <span key="d" className="num">{i.date}</span>, i.city, i.budget || "未填",
            <span key="t" className="num">{i.targets}</span>,
            <span key="r" className="num">{i.replied}</span>,
            <span key="q" className="num">{i.quoted}</span>,
          ])}
          empty="還沒有邀約。"
        />
      </section>

      <section className="sec">
        <h2 className="h2">評價</h2>
        <p className="small">只有實際送出邀約、而且收到報價的人能評。不當內容可以隱藏，原始評分仍保留在紀錄裡。</p>
        <Table
          head={["時間", "表演者", "評分", "內容", "評價者", "狀態", ""]}
          rows={reviews.map((r) => [
            <When key="w" v={r.at} />,
            <Out key="p" href={`/u/${r.slug}`}>{r.performer}</Out>,
            <span key="s" className="num">{"★".repeat(r.rating)}</span>,
            <span key="c" className="block max-w-[320px]">{r.review || <span className="small">沒有留言</span>}</span>,
            <span key="b" className="small">{r.by}・{r.occasion}</span>,
            r.hidden ? <Tag>已隱藏</Tag> : <Tag on>顯示中</Tag>,
            <ReviewActions key="a" inquiryId={r.inquiryId} performerId={r.performerId} hidden={r.hidden} />,
          ])}
          empty="還沒有評價。"
        />
      </section>
    </div>
  );
}
