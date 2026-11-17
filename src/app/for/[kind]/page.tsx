import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME, env } from "@/lib/env";
import { Band, StageFooter, StageHeader } from "@/components/market/Shell";
import { Faq } from "@/components/market/Bits";
import { Lead } from "@/components/market/Lead";
import { JsonLd, absUrl, breadcrumb } from "@/lib/seo";
import { KINDS, kindBySlug, type KindSlug } from "@/lib/kinds";
import { COPY } from "./copy";

export const dynamic = "force-static";
export function generateStaticParams() {
  return KINDS.map((k) => ({ kind: k.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const slug = (await params).kind;
  const c = COPY[slug as KindSlug];
  if (!c) return {};
  return {
    title: `${c.title}｜${APP_NAME}`,
    description: c.meta,
    alternates: { canonical: `/for/${slug}` },
  };
}

/** 分眾著陸頁：同一個產品，用這個族群自己的語言講一次 */
export default async function ForKind({ params }: { params: Promise<{ kind: string }> }) {
  const slug = (await params).kind as KindSlug;
  const c = COPY[slug];
  if (!c) notFound();
  const k = kindBySlug(slug);
  const fee = Math.round(env.billing.feeRate * 100);

  return (
    <div className="stage min-h-screen">
      <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: c.title, path: `/for/${slug}` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: absUrl(`/for/${slug}`),
          mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <StageHeader />
      <main id="main">
        <Band light="sodium" className="pt-8 pb-16 md:pt-10">
        <nav className="text-[14px] text-[color:var(--dim)]"><Link href="/">首頁</Link> › {k.name}</nav>
        <div className="mt-6 grid items-center gap-10 md:grid-cols-[1fr_auto] md:gap-16">
          <div className="max-w-[620px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] px-3 py-1.5 text-[13px] text-[color:var(--dim)]">{k.name}</span>
            <h1 className="d1 mt-5 whitespace-pre-line">{c.h1}</h1>
            <p className="lede mt-6">{c.lede}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link>
              <Link href="/p/demo" className="sbtn sbtn-ghost">看聽眾會看到什麼</Link>
            </div>
            <p className="mt-4 text-[14px] text-[color:var(--dim)]">免費建立，只有成交時收 {fee}%。</p>
          </div>
          <div className="glow-phone mx-auto w-[230px] shrink-0 overflow-hidden md:w-[260px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.hero} alt={c.heroAlt} className="block w-full" />
          </div>
        </div>
        </Band>

        {/* 了解：這個族群現在的痛 */}
        <Band className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">{c.painTitle}</h2>
          <div className="mt-10 grid gap-x-12 gap-y-9 md:grid-cols-3">
            {c.pains.map((x) => (
              <div key={x.t}>
                <h3 className="d3">{x.t}</h3>
                <p className="body mt-3">{x.d}</p>
              </div>
            ))}
          </div>
        </Band>

        {/* 感興趣：我們怎麼解 */}
        <Band light="wash" className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">{c.fixTitle}</h2>
          <p className="body mt-4">{c.fixDesc}</p>
          <div className="pane glow-screen mt-9 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.screen} alt={c.screenAlt} className="block w-full" />
          </div>
          <div className="mt-9 grid gap-x-12 gap-y-9 md:grid-cols-3">
            {c.fixes.map((x) => (
              <div key={x.t}>
                <h3 className="d3">{x.t}</h3>
                <p className="body mt-3">{x.d}</p>
              </div>
            ))}
          </div>
        </Band>

        {/* 轉化：這個情境的預設 */}
        <Band className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">選了這個情境，這些都幫你設好</h2>
          <div className="mt-9 grid gap-x-12 md:grid-cols-2">
            {[
              ["排隊上限", `${k.maxQueue} 首`],
              ["預設金額", k.amounts.map((a) => `NT$${a}`).join("／")],
              ["大螢幕", k.bigScreen ? "預設開啟" : "預設關閉"],
              ["列印立牌", k.poster === "standee" ? "直立小卡" : k.poster === "table" ? "桌卡" : "不需要（用連結）"],
              ["範例歌單", `${k.menu.length} 首`],
              ["收款方式", k.shows.payCode ? "收款碼＋刷卡" : "刷卡金流"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-[color:var(--line)] py-3.5">
                <span className="text-[color:var(--dim)]">{label}</span>
                <span className="num font-bold">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link>
            <Link href="/pricing" className="sbtn sbtn-ghost">看方案與費用</Link>
          </div>
          <p className="mt-4 text-[14px] text-[color:var(--dim)]">註冊時選一個情境就套用，之後都能改。</p>
        </Band>

        <Band className="rule pt-16 pb-16 md:pt-20">
          <h2 className="d2">{k.name}最常問的</h2>
          <div className="mt-8 max-w-[760px]">
            <Faq dark items={c.faq.map((f) => ({ q: f.q, a: f.a }))} />
          </div>
        </Band>

        <Band light="sodium" className="rule pt-16 pb-24 md:pt-20 md:pb-28">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="d2">{c.endTitle}</h2>
              <p className="body mt-4">{c.endDesc}</p>
              <div className="mt-8"><Link href="/login" className="sbtn sbtn-main">免費建立我的點歌頁</Link></div>
              <p className="mt-4 text-[14px] text-[color:var(--dim)]">不用信用卡，不綁約。</p>
            </div>
            <Lead dark />
          </div>
        </Band>
      </main>
      <StageFooter />
    </div>
  );
}
