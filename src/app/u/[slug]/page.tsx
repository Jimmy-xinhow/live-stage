import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { liveSessions, menuItems, shows } from "@/lib/db/schema";
import { getPerformerBySlug } from "@/lib/orders";
import { getFan, isFollowing } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { APP_NAME, LIFF_ID, env } from "@/lib/env";
import { areaBySlug } from "@/lib/areas";
import { actName, streamInfo } from "@/lib/acts";
import { reviewsOf, trackRecord } from "@/lib/market";
import { taggedEvents } from "@/lib/events";
import { nt } from "@/lib/format";
import { JsonLd, absUrl, breadcrumb, showEvent } from "@/lib/seo";
import { EventLine, Photo, ShowRow, SiteFooter, SiteHeader } from "@/components/Site";
import { upcomingEvents } from "@/lib/events";
import { FollowMini } from "@/components/FollowMini";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return {};
  const area = areaBySlug(p.city);
  const what = `${area?.short ?? ""}${actName(p.actType)}`;
  return {
    title: `${p.displayName}｜${what}・點歌歌單與演出紀錄｜${APP_NAME}`,
    description: `${p.bio ? p.bio.slice(0, 70) + "　" : ""}${what}。平台累積的演出場次、歌單與接下來的演出，可以直接邀請演出。`,
    alternates: { canonical: `/u/${p.slug}` },
    openGraph: { title: `${p.displayName}｜${what}`, description: p.bio.slice(0, 80), type: "profile", images: p.coverUrl || p.avatarUrl ? [(p.coverUrl || p.avatarUrl)!] : undefined },
    robots: area && p.status === "active" && p.bio ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getPerformerBySlug((await params).slug);
  if (!p || p.status === "suspended") notFound();
  const db = await getDb();
  const fan = await getFan(await getFanId());
  const [rec, menu, upcoming, [session], following] = await Promise.all([
    trackRecord(p),
    db.select().from(menuItems).where(and(eq(menuItems.performerId, p.id), eq(menuItems.enabled, true))).orderBy(desc(menuItems.requestCount), asc(menuItems.sort)).limit(60),
    db.select().from(shows).where(and(eq(shows.performerId, p.id), gte(shows.startsAt, new Date()))).orderBy(asc(shows.startsAt)).limit(5),
    p.liveSessionId ? db.select().from(liveSessions).where(eq(liveSessions.id, p.liveSessionId)) : [],
    fan ? isFollowing(p.id, fan.id) : false,
  ]);
  const area = areaBySlug(p.city);
  const act = actName(p.actType);
  const video = streamInfo(p.videoUrl);
  const serve = p.serviceAreas.map((s) => areaBySlug(s)?.short).filter(Boolean).join("、");
  const live = !!session;
  const sidebar = (
    <div className="card flex flex-col gap-4 p-5 md:sticky md:top-6 md:p-6">
      <div>
        <span className="label">點歌</span>
        <p className="mt-1 text-[15px] leading-7">
          {live
            ? `${p.displayName} 現在正在演出，可以直接點歌。`
            : `到了現場掃 ${p.displayName} 的 QR 就能點歌。追蹤後，開演時會收到 LINE 通知。`}
        </p>
      </div>
      <dl className="flex flex-col gap-2.5 text-[14px]">
        <div className="flex justify-between gap-3"><dt className="text-ink3">常出沒</dt><dd>{p.district || area?.short || "未設定"}</dd></div>
        {menu.length > 0 && <div className="flex justify-between gap-3"><dt className="text-ink3">歌單</dt><dd className="num font-semibold">{menu.length} 首</dd></div>}
        {rec.shows > 0 && <div className="flex justify-between gap-3"><dt className="text-ink3">平台紀錄</dt><dd className="num font-semibold">{rec.shows} 場</dd></div>}
      </dl>
      {live
        ? <Link href={`/p/${p.slug}`} className="btn btn-primary btn-block">現在就去點歌</Link>
        : <Link href={`/p/${p.slug}`} className="btn btn-secondary btn-block">看他的歌單</Link>}
      <p className="small text-center text-ink3">款項直接付給表演者，平台不經手</p>
    </div>
  );
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "PerformingGroup", name: p.displayName, description: p.bio || undefined, url: absUrl(`/u/${p.slug}`), image: p.coverUrl || p.avatarUrl || undefined, genre: p.genres || undefined, ...(area ? { location: { "@type": "Place", name: p.district || area.name, address: { "@type": "PostalAddress", addressLocality: area.official, addressCountry: "TW" } } } : {}) }} />
      {area && <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: area.name, path: `/area/${area.slug}` }, { name: act, path: `/area/${area.slug}/${p.actType}` }, { name: p.displayName, path: `/u/${p.slug}` }])} />}
      {upcoming[0] && <JsonLd data={showEvent({ startsAt: upcoming[0].startsAt.toISOString(), location: upcoming[0].location, note: upcoming[0].note, name: p.displayName, slug: p.slug, cityOfficial: area?.official })} />}
      <SiteHeader />
      {session && (
        <Link href={`/p/${p.slug}`} className="block bg-now text-ink">
          <span className="wrap flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-ink" /><strong>現在演出中</strong><span>{session.location}</span></span>
            <span className="btn btn-primary btn-sm">在現場？去點歌</span>
          </span>
        </Link>
      )}
      <main className="wrap pb-24 md:pb-10">
        <nav aria-label="麵包屑" className="small flex flex-wrap gap-1.5 py-4 text-ink3">
          <Link href="/">首頁</Link>{area && <><span>›</span><Link href={`/area/${area.slug}`}>{area.name}</Link><span>›</span><Link href={`/area/${area.slug}/${p.actType}`}>{act}</Link></>}
        </nav>
        <div className="grid gap-8 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-8">
            <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:gap-6">
              <Photo src={p.coverUrl ?? p.avatarUrl} ratio="4 / 5" label="尚未上傳主圖" className="!rounded-[20px]" />
              <div className="flex flex-col gap-3">
                <div><div className="small">{act}・{[area?.name, p.district].filter(Boolean).join(" ")}</div><h1 className="h-display">{p.displayName}</h1>{p.genres && <div className="small">{p.genres}</div>}</div>
                {p.bio && <p className="max-w-[600px] text-ink2">{p.bio}</p>}
                <FollowMini slug={p.slug} initialFollowing={following} fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null} liffId={LIFF_ID} devLogin={env.allowDevLogin} count={rec.followers} />
              </div>
            </div>

            <section className="mt-10" aria-labelledby="rec">
              <div className="mb-2 flex items-baseline justify-between gap-3"><h2 id="rec" className="h2">平台演出紀錄</h2><span className="small text-ink3">系統自動累積，表演者不能修改</span></div>
              <div className="grid grid-cols-2 border-y-2 border-ink md:grid-cols-4">
                {[[rec.shows, "場演出"], [rec.requests, "首被點播"], [rec.followers, "位粉絲"], [rec.checkins, "次現場簽到"]].map(([n, l], i) => (
                  <div key={l} className={`py-4 ${i % 2 ? "border-l border-rule pl-5" : ""} ${i > 1 ? "border-t border-rule md:border-t-0" : ""} ${i === 2 ? "md:border-l md:pl-5" : ""}`}><b className="num block text-[32px] leading-9 font-extrabold">{Number(n).toLocaleString("zh-TW")}</b><span className="small text-ink3">{l}</span></div>
                ))}
              </div>
            </section>

            {video?.embed && (
              <section className="mt-10"><h2 className="h2 mb-3">演出影片</h2><div className="overflow-hidden rounded-[20px] bg-sunken" style={{ aspectRatio: "16 / 9" }}><iframe src={video.embed} title={`${p.displayName} 演出影片`} className="h-full w-full" allowFullScreen loading="lazy" /></div></section>
            )}

            {upcoming.length > 0 && (
              <section className="sec mt-10"><h2 className="h2 mb-1">接下來的演出</h2>{upcoming.map((s) => <ShowRow key={s.id} s={{ startsAt: s.startsAt.toISOString(), location: s.location, note: s.note, slug: p.slug, name: s.location, city: area }} />)}</section>
            )}

            {menu.length > 0 && (
              <section className="sec mt-10">
                <div className="mb-2 flex items-baseline justify-between gap-3"><h2 className="h2">會唱的歌・服務（{menu.length}）</h2><span className="small text-ink3">現場掃碼就能點</span></div>
                <div className="grid gap-x-6 md:grid-cols-2">
                  {menu.map((m, i) => (
                    <div key={m.id} className="row flex items-baseline gap-3 py-2.5"><span className="num w-6 text-ink3">{String(i + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="font-medium">{m.title}</span>{m.subtitle && <span className="small"> {m.subtitle}</span>}</span>{m.requestCount > 0 && <span className="small text-ink3">被點 <span className="num">{m.requestCount}</span> 次</span>}</div>
                  ))}
                </div>
              </section>
            )}

          </div>
          <aside className="hidden md:col-span-4 md:block">{sidebar}</aside>
        </div>
        <div className="mt-10 md:hidden">{sidebar}</div>
      </main>
      <SiteFooter />
    </>
  );
}
