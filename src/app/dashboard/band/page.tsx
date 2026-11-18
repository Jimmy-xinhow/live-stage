import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { listMembers, monthlySplit } from "@/lib/band";
import { planHasPro } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";
import { env } from "@/lib/env";
import { PageHead } from "@/components/back/Shell";
import { BandForm } from "./BandForm";

export const dynamic = "force-dynamic";

const nt = (n: number) => `NT$${n.toLocaleString()}`;

export default async function Band() {
  const { performer: p } = (await requireAccount())!;
  if (!planHasPro(effectivePlan(p)))
    return (
      <div className="flex max-w-[620px] flex-col gap-5">
        <PageHead title="樂團拆帳" desc="設好比例，每一筆收款自動算出每個人分多少，團員各自看得到自己的數字。" />
        <div className="card p-5">
          <p className="leading-7">
            這是<strong>全部方案</strong>的功能。設定比例之後，每一筆成交都會在當下留一份拆帳紀錄，
            團員用自己的 LINE 登入就只看得到自己那一份。
          </p>
          <p className="small mt-3">
            款項還是直接進你的收款帳戶，平台不經手——系統做的是把帳算清楚，不是代為撥款。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/plan" className="btn btn-now">看方案</Link>
          </div>
        </div>
      </div>
    );

  const members = await listMembers(p.id);
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).format(new Date());
  const [y, mo] = now.split("-").map(Number);
  const split = members.length >= 2 ? await monthlySplit(p.id, y, mo) : [];
  const monthTotal = split.reduce((n, s) => n + s.total, 0);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageHead
          title="樂團拆帳"
          desc="設好比例，每一筆成交都會在當下留一份拆帳紀錄。之後改比例不會動到已經發生的帳。"
        />
        <p className="small max-w-[60ch]">
          款項直接進你的收款帳戶，平台不經手——系統做的是把帳算清楚、讓每個人看得到自己的數字，不是代為撥款。
          實際的錢還是要你分給團員。
        </p>
      </section>

      <section className="sec">
        <h2 className="h2">團員與比例</h2>
        <p className="small mt-1">比例用到小數一位，三個人均分會是 33.4 / 33.3 / 33.3，加起來正好 100%。</p>
        <div className="mt-4">
          <BandForm
            baseUrl={env.baseUrl}
            initial={members.map((m) => ({ id: m.id, name: m.name, sharePermille: m.sharePermille, inviteCode: m.inviteCode, bound: !!m.lineUserId }))}
          />
        </div>
      </section>

      {split.length > 0 && (
        <section className="sec">
          <h2 className="h2">這個月（{y} 年 {mo} 月）</h2>
          <p className="small mt-1">共 {nt(monthTotal)}。退款的訂單不算在內。</p>
          <div className="mt-3 overflow-x-auto">
            <table className="tbl w-full">
              <thead><tr><th>團員</th><th className="text-right">比例</th><th className="text-right">筆數</th><th className="text-right">分得</th></tr></thead>
              <tbody>
                {split.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td className="num text-right">{(members.find((m) => m.id === s.memberId)?.sharePermille ?? 0) / 10}%</td>
                    <td className="num text-right">{s.count}</td>
                    <td className="num text-right">{nt(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
