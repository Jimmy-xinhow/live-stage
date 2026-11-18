import Link from "next/link";
import { getFanId } from "@/lib/session";
import { getFan } from "@/lib/fans";
import { bandsOf, memberMonth } from "@/lib/band";
import { SiteFooter, SiteHeader } from "@/components/Site";

export const dynamic = "force-dynamic";

const nt = (n: number) => `NT$${n.toLocaleString()}`;
const tpe = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d) : "";

/** 團員看自己的拆帳。只看得到自己那一份，看不到別人的數字 */
export default async function MyBand() {
  const fan = await getFan(await getFanId());
  const bands = fan?.lineUserId ? await bandsOf(fan.lineUserId) : [];

  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit" }).format(new Date());
  const [y, mo] = now.split("-").map(Number);

  const detail = await Promise.all(
    bands.map(async (b) => {
      const rows = await memberMonth(b.memberId, y, mo);
      return { ...b, rows, total: rows.reduce((n, r) => n + r.amount, 0) };
    }),
  );

  return (
    <>
      <SiteHeader />
      <main className="wrap min-h-[60vh] max-w-[680px] py-12">
        <h1 className="h1">我的拆帳</h1>
        {!fan?.lineUserId ? (
          <p className="mt-3 leading-7">請先用團長給你的邀請連結登入。</p>
        ) : bands.length === 0 ? (
          <p className="mt-3 leading-7">你還沒有加入任何團。跟團長要一條加入連結。</p>
        ) : (
          <div className="mt-6 flex flex-col gap-8">
            {detail.map((b) => (
              <section key={b.memberId} className="sec">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="h2">{b.bandName}</h2>
                    <p className="small mt-1">你的比例 {b.sharePermille / 10}%・{y} 年 {mo} 月</p>
                  </div>
                  <strong className="num h2">{nt(b.total)}</strong>
                </div>

                {b.rows.length === 0 ? (
                  <p className="small mt-3">這個月還沒有收款。</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="tbl w-full">
                      <thead><tr><th>時間</th><th>項目</th><th className="text-right">該筆金額</th><th className="text-right">你分得</th></tr></thead>
                      <tbody>
                        {b.rows.map((r, i) => (
                          <tr key={i}>
                            <td className="num whitespace-nowrap">{tpe(r.paidAt)}</td>
                            <td>{r.title ?? "打賞"}</td>
                            <td className="num text-right">{r.orderAmount.toLocaleString()}</td>
                            <td className="num text-right">{r.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="small mt-3">
                  款項是進 {b.bandName} 的收款帳戶，這裡算的是你應得的部分，實際的錢由團長分給你。
                </p>
                <Link href={`/p/${b.bandSlug}`} className="small mt-2 inline-block underline">看這個團的點歌頁</Link>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
