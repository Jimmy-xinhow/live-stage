import { Table } from "../Bits";
import { PageHead } from "@/components/back/Shell";
import { unusedFeatures, usageSummary } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function Usage() {
  const [week, month, unused] = await Promise.all([usageSummary(7), usageSummary(30), unusedFeatures(30)]);
  const byName = new Map(week.map((r) => [r.name, r]));

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        title="功能使用"
        desc={<>只記「誰在什麼時候用了哪個功能」，沒有內容、沒有金額、沒有觀眾身分。保留 90 天。</>}
      />

      <section className="sec">
        <h2 className="h2">近 30 天</h2>
        <p className="small mb-3 max-w-[620px}">人數是不重複的表演者。次數高但人數少，代表那是少數人的工具，不是全體需求。</p>
        {month.length ? (
          <Table
            head={["功能", "30 天次數", "30 天人數", "7 天次數"]}
            rows={month.map((r) => [r.label, String(r.count), String(r.people), String(byName.get(r.name)?.count ?? 0)])}
          />
        ) : (
          <p className="small">還沒有資料。剛上線或剛清過都會是這樣。</p>
        )}
      </section>

      <section className="sec">
        <h2 className="h2">30 天內沒有人用過</h2>
        <p className="small mb-3 max-w-[620px]">
          這一欄才是這張表真正的用處。一直在這裡的功能，要嘛沒人需要，要嘛沒人找得到——
          兩種都是問題，但解法完全不同。
        </p>
        {unused.length ? (
          <ul className="flex flex-wrap gap-2">
            {unused.map((u) => (
              <li key={u.name} className="rounded-[8px] border border-rule px-3 py-1.5 text-[14px]">{u.label}</li>
            ))}
          </ul>
        ) : (
          <p className="small">每一項都有人用過。</p>
        )}
      </section>
    </div>
  );
}
