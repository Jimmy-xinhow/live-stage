import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eventDetail, fmtWhen } from "@/lib/events";
import { areaBySlug } from "@/lib/areas";
import { actName } from "@/lib/acts";
import { APP_NAME } from "@/lib/env";
import { JsonLd, absUrl, breadcrumb } from "@/lib/seo";
import { Photo, SiteFooter, SiteHeader } from "@/components/Site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await eventDetail((await params).id);
  if (!d) return {};
  const area = areaBySlug(d.ev.city);
  return {
    title: `${d.ev.title}｜${area?.short ?? ""}${d.ev.place}・${fmtWhen(d.ev.startsAt)}｜${APP_NAME}`,
    description: (d.ev.description || `${d.org?.displayName ?? ""}在${d.ev.place}的演出活動。`).slice(0, 120),
    alternates: { canonical: `/e/${d.ev.id}` },
    robots: d.ev.status === "published" ? undefined : { index: false, follow: true },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const d = await eventDetail((await params).id);
  if (!d) notFound();
  const { ev, org, acts } = d;
  const area = areaBySlug(ev.city);
  const past = ev.startsAt.getTime() < Date.now();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MusicEvent",
          name: ev.title,
          startDate: ev.startsAt.toISOString(),
          endDate: ev.endsAt?.toISOString(),
          eventStatus: ev.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          description: ev.description || undefined,
          image: ev.coverUrl || undefined,
          location: { "@type": "Place", name: ev.place, address: { "@type": "PostalAddress", streetAddress: ev.address || undefined, addressLocality: area?.official ?? "", addressCountry: "TW" } },
          organizer: { "@type": "Organization", name: org?.displayName ?? "", url: absUrl(`/e/${ev.id}`) },
          performer: acts.map((a) => ({ "@type": "PerformingGroup", name: a.name, url: absUrl(`/u/${a.slug}`) })),
          url: absUrl(`/e/${ev.id}`),
        }}
      />
      {area && <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: "活動", path: "/events" }, { name: ev.title, path: `/e/${ev.id}` }])} />}
      <SiteHeader />
      <main className="wrap pb-16">
        <nav aria-label="麵包屑" className="small flex flex-wrap gap-1.5 py-4 text-ink3">
          <Link href="/">首頁</Link><span>›</span><Link href="/events">活動</Link>{area && <><span>›</span><Link href={`/area/${area.slug}`}>{area.name}</Link></>}
        </nav>

        <div className="grid gap-8 md:grid-cols-12 md:gap-6">
          <div className="md:col-span-8">
            {ev.status === "cancelled" && <p className="mb-4 rounded-[12px] border-[1.5px] border-err px-4 py-3 text-[14px] text-err">這場活動已取消。</p>}
            <span className="label">{area?.name}{ev.place ? `・${ev.place}` : ""}</span>
            <h1 className="h-display">{ev.title}</h1>
            <p className="small mt-1">{fmtWhen(ev.startsAt)}{ev.endsAt ? ` – ${new Date(ev.endsAt).toLocaleTimeString("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}{past ? "（已結束）" : ""}</p>

            {ev.coverUrl && <div className="mt-5"><Photo src={ev.coverUrl} ratio="16 / 9" label="活動主視覺" className="!rounded-[20px]" /></div>}
            {ev.description && <p className="mt-5 max-w-[600px] whitespace-pre-wrap text-ink2">{ev.description}</p>}

            {(acts.length > 0 || ev.guestActs) && (
              <section className="sec mt-10">
                <h2 className="h2">演出者</h2>
                <div className="mt-2 border-t border-rule">
                  {acts.map((a) => (
                    <Link key={a.slug} href={`/u/${a.slug}`} className="row grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 py-4">
                      <Photo src={a.cover ?? a.avatar} ratio="1 / 1" label="照片" />
                      <span className="min-w-0"><strong className="h3 block">{a.name}</strong><span className="small block">{actName(a.act)}</span>{a.bio && <span className="small block truncate">{a.bio}</span>}</span>
                    </Link>
                  ))}
                  {ev.guestActs && <p className="small py-3">其他演出者：{ev.guestActs}</p>}
                </div>
              </section>
            )}
          </div>

          <aside className="md:col-span-4">
            <div className="card flex flex-col gap-4 p-5 md:sticky md:top-6">
              <dl className="flex flex-col gap-2.5 text-[14px]">
                <div><dt className="label mb-0.5">時間</dt><dd className="num font-semibold">{fmtWhen(ev.startsAt)}</dd></div>
                <div><dt className="label mb-0.5">地點</dt><dd>{ev.place}{ev.address ? <span className="small block">{ev.address}</span> : null}</dd></div>
                {ev.priceText && <div><dt className="label mb-0.5">票價</dt><dd>{ev.priceText}</dd></div>}
                {org && <div><dt className="label mb-0.5">主辦</dt><dd>{org.displayName}{org.website ? <a href={org.website} target="_blank" rel="noreferrer nofollow" className="small ml-2 underline">官網</a> : null}</dd></div>}
              </dl>
              {ev.link && ev.status === "published" && !past && <a href={ev.link} target="_blank" rel="noreferrer nofollow" className="btn btn-primary btn-block">購票／報名</a>}
              <p className="small text-center text-ink3">活動由主辦自行刊登，{APP_NAME}不經手票務</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
