import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { menuItems } from "@/lib/db/schema";
import { getPerformerBySlug, publicState } from "@/lib/orders";
import { fmtShowTime, getFan, isFollowing, nextShow } from "@/lib/fans";
import { getFanId } from "@/lib/session";
import { APP_NAME, LIFF_ID, env } from "@/lib/env";
import { PerformerApp } from "./PerformerApp";
import { payMethodSummary } from "@/lib/paymethods";
import { areaBySlug } from "@/lib/areas";
import { JsonLd, absUrl, breadcrumb, showEvent } from "@/lib/seo";
import Link from "next/link";
import { headers } from "next/headers";
import { streamInfo } from "@/lib/acts";
import { currentGame } from "@/lib/games";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPerformerBySlug((await params).slug);
  if (!p) return {};
  const area = areaBySlug(p.city);
  const db = await getDb();
  const songs = await db.select({ t: menuItems.title }).from(menuItems).where(eq(menuItems.performerId, p.id)).orderBy(asc(menuItems.sort)).limit(6);
  const where = [area?.short, p.district].filter(Boolean).join("・");
  return {
    title: `${p.displayName}｜${area ? `${area.short}街頭藝人` : "街頭藝人"}・點歌歌單｜${APP_NAME}`,
    description: (p.bio ? `${p.bio.slice(0, 60)}　` : "") + `${where ? `${where}演出，` : ""}歌單${songs.length ? `有〈${songs.map((x) => x.t).slice(0, 3).join("〉〈")}〉等` : ""}，掃碼就能點歌打賞、追蹤開唱通知。`,
    alternates: { canonical: `/u/${p.slug}` },
    openGraph: { title: `${p.displayName}｜掃碼點歌`, description: p.bio.slice(0, 80), type: "profile", images: p.avatarUrl ? [p.avatarUrl] : undefined },
    // 沒有歌單或沒設定縣市的頁面先不收錄
    robots: songs.length && area && p.status === "active" ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const p = await getPerformerBySlug((await params).slug);
  if (!p || p.status === "suspended") notFound();
  const db = await getDb();
  const [menu, state, fan] = await Promise.all([
    db.select().from(menuItems).where(eq(menuItems.performerId, p.id)).orderBy(asc(menuItems.sort)),
    publicState(p),
    getFan(await getFanId()),
  ]);
  const following = fan ? await isFollowing(p.id, fan.id) : false;
  const ns = await nextShow(p.id);

  const area = areaBySlug(p.city);
  const stream = state.live ? streamInfo(p.streamUrl) : null;
  const host = (await headers()).get("host")?.split(":")[0] ?? "localhost";
  const game = state.live ? await currentGame(p.id) : null;
  return (
    <>
    {state.live && (
      <div className="mx-auto max-w-md">
        {stream?.embed ? (
          <div className="bg-ink" style={{ aspectRatio: "16 / 9" }}><iframe src={stream.embed.replace("{host}", host)} title={`${p.displayName} 直播`} className="h-full w-full" allowFullScreen /></div>
        ) : stream && p.streamUrl ? (
          <a href={p.streamUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-paper"><span>在 {stream.name} 直播中</span><span className="underline">前往觀看</span></a>
        ) : null}
        <Link href={game?.status === "running" ? `/p/${p.slug}/game` : `/p/${p.slug}/hub`} className="flex items-center justify-between gap-3 bg-now px-4 py-3 text-ink">
          <strong>{game?.status === "running" ? "遊戲進行中，一起玩" : "現場互動：應援、簽到、抽獎、舉手"}</strong><span className="btn btn-primary btn-sm">進入</span>
        </Link>
      </div>
    )}
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "PerformingGroup",
        name: p.displayName,
        description: p.bio || undefined,
        url: absUrl(`/p/${p.slug}`),
        image: p.avatarUrl || undefined,
        ...(area ? { location: { "@type": "Place", name: p.district || area.name, address: { "@type": "PostalAddress", addressLocality: area.official, addressCountry: "TW" } } } : {}),
      }}
    />
    {area && <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: `${area.name}街頭藝人`, path: `/area/${area.slug}` }, { name: p.displayName, path: `/p/${p.slug}` }])} />}
    {ns && <JsonLd data={showEvent({ startsAt: ns.startsAt.toISOString(), location: ns.location, note: ns.note, name: p.displayName, slug: p.slug, cityOfficial: area?.official })} />}
    <PerformerApp
      performer={{
        slug: p.slug, name: p.displayName, avatar: p.avatarUrl, bio: p.bio, category: p.category, color: p.themeColor,
        presets: p.presetAmounts, min: p.minAmount, max: p.maxAmount, manualLabel: payMethodSummary(p.payMethods) || "LINE Pay",
      }}
      menu={menu.map((m) => ({ id: m.id, title: m.title, subtitle: m.subtitle, category: m.category, price: m.price, enabled: m.enabled, hot: m.requestCount }))}
      initialState={state}
      fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null}
      initialFollowing={following}
      nextShow={ns ? { when: fmtShowTime(ns.startsAt), location: ns.location, note: ns.note } : null}
      liffId={LIFF_ID}
      devLogin={env.allowDevLogin}
      oaUrl={env.line.oaAddFriendUrl}
      appName={APP_NAME}
      initialTab={tab === "rank" || tab === "queue" || tab === "wall" ? tab : "menu"}
      area={area ? { slug: area.slug, name: area.name } : null}
      district={p.district}
    />
    </>
  );
}
