import Link from "next/link";
import { Empty, PageHead, Section } from "@/components/back/Shell";
import { and, desc, eq, sql } from "drizzle-orm";
import { requirePerformer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { liveSessions, menuItems, orders } from "@/lib/db/schema";
import { displayName, payOptions, startOfTodayTaipei, totalsSince } from "@/lib/orders";
import { canAcceptOrders, fmtPoints } from "@/lib/billing";
import { nt } from "@/lib/format";
import { env } from "@/lib/env";
import { GATEWAY_LABEL } from "@/lib/payments";
import { performerShareUrl } from "@/lib/share";
import { OrderRow } from "./OrderRow";

export default async function Dashboard() {
  const { performer: p } = (await requirePerformer())!;
  const db = await getDb();
  const today = startOfTodayTaipei();
  const [[{ menu }], [{ shows }], t1, t7, t30, list] = await Promise.all([
    db.select({ menu: sql<number>`count(*)::int` }).from(menuItems).where(eq(menuItems.performerId, p.id)),
    db.select({ shows: sql<number>`count(*)::int` }).from(liveSessions).where(eq(liveSessions.performerId, p.id)),
    totalsSince(p.id, today),
    totalsSince(p.id, new Date(today.getTime() - 6 * 86400_000)),
    totalsSince(p.id, new Date(today.getTime() - 29 * 86400_000)),
    db.select().from(orders).where(and(eq(orders.performerId, p.id), eq(orders.status, "paid"))).orderBy(desc(orders.paidAt)).limit(30),
  ]);

  const opts = payOptions(p);
  const steps = [
    { done: opts.manual || opts.auto, label: "放上 LINE Pay／街口收款碼", href: "/dashboard/settings", hint: "截圖上傳，免申請" },
    { done: Number(menu) > 0, label: "貼上你會唱的歌單", href: "/dashboard/menu", hint: "整份貼上，一行一首" },
    { done: !!p.city, label: "選擇演出縣市", href: "/dashboard/settings", hint: "讓附近的人找得到你" },
    { done: Number(shows) > 0, label: "列印 QR 立牌，到現場按「開始演出」", href: "/dashboard/poster", hint: "放在琴盒或麥克風架旁" },
    { done: t30.count > 0, label: "收到第一筆點歌", href: "/dashboard/stage", hint: "看到 LINE Pay 入帳就按「已收到」" },
  ];
  const left = steps.filter((x) => !x.done).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHead
        title="總覽"
        desc={<>作品頁 {performerShareUrl(p.slug).replace("/p/", "/u/")}・點歌頁 {performerShareUrl(p.slug)}・收款碼 {p.payMethods.length} 個・刷卡 {GATEWAY_LABEL[p.gateway]}</>}
        actions={<><Link href="/dashboard/stage" className="btn btn-primary btn-sm">開演出控制台</Link><Link href="/dashboard/poster" className="btn btn-secondary btn-sm">列印 QR 立牌</Link></>}
      />
      {!canAcceptOrders(p.pointsCents) && (
        <Link href="/dashboard/points" className="rounded-[12px] border-[1.5px] border-err px-4 py-3 text-[14px] text-err">點數用完了（{fmtPoints(p.pointsCents)} 點），點歌與打賞已暫停。按這裡補充點數。</Link>
      )}
      {env.line.oaAddFriendUrl && <a href={env.line.oaAddFriendUrl} className="rounded-[12px] bg-sunken px-4 py-3 text-[14px] underline">加入官方帳號好友，才能收到即時點歌通知</a>}

      {left > 0 && (
        <Section title="開始使用" desc={`還剩 ${left} 步。`}>
          <ol>
            {steps.map((x, i) => (
              <li key={x.label} className="row">
                <Link href={x.href} className="flex min-h-[64px] items-center gap-3 py-2.5">
                  <span className={`num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${x.done ? "bg-sunken text-ink3" : "bg-ink text-paper"}`}>{i + 1}</span>
                  <span className="flex flex-1 flex-col"><strong className={x.done ? "font-medium text-ink3 line-through" : ""}>{x.label}</strong><span className="small">{x.hint}</span></span>
                  <span className="small shrink-0">{x.done ? "完成" : "前往"}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="收入">
        <div className="mt-3 grid grid-cols-3 border-y border-rule">
          {([["今天", t1], ["近 7 天", t7], ["近 30 天", t30]] as const).map(([label, s], i) => (
            <div key={label} className={`flex flex-col py-4 ${i ? "border-l border-rule pl-4" : ""}`}>
              <span className="label">{label}</span>
              <strong className="num text-[22px] leading-8 md:text-[28px] md:leading-10">{nt(s.sum)}</strong>
              <span className="small num">{s.count} 筆・服務費 {fmtPoints(s.feeCents)} 點</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/p/${p.slug}`} className="btn btn-secondary btn-sm">看點歌頁</Link>
          <Link href={`/live/${p.slug}`} className="btn btn-secondary btn-sm">大螢幕</Link>
          <Link href={`/u/${p.slug}`} className="btn btn-secondary btn-sm">看作品頁</Link>
        </div>
      </Section>

      <Section title="最近的點歌與打賞">
        {list.length ? (
          <ul className="mt-2">
            {list.map((o) => (
              <OrderRow key={o.id} o={{ id: o.id, name: displayName(o), amount: o.amount, itemTitle: o.itemTitle, message: o.message, reply: o.reply, hidden: o.hidden, paidAt: (o.paidAt ?? o.createdAt).toISOString(), canPush: !!o.fanId, queueStatus: o.queueStatus }} />
            ))}
          </ul>
        ) : (
          <Empty text="還沒有點歌或打賞紀錄。" action={<Link href="/dashboard/menu" className="btn btn-secondary btn-sm">先把歌單建好</Link>} />
        )}
      </Section>
    </div>
  );
}
