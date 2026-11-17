import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APP_NAME, env } from "@/lib/env";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { Cta, Faq, Head, Phone, Screen } from "@/components/market/Bits";
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
    <>
      <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: c.title, path: `/for/${slug}` }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: absUrl(`/for/${slug}`),
          mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <SiteHeader />
      <main id="main" className="wrap">
        <nav className="small pt-6"><Link href="/">首頁</Link> › {k.name}</nav>

        {/* 看見 */}
        <section className="grid items-center gap-10 pt-8 pb-14 md:grid-cols-[1fr_auto] md:gap-16 md:pt-10">
          <div className="max-w-[620px]">
            <span className="label">{k.name}</span>
            <h1 className="mt-3 text-[34px] leading-[1.14] font-extrabold tracking-tight md:text-[50px]">{c.h1}</h1>
            <p className="mt-5 text-[17px] leading-8 text-ink2 md:text-[18px]">{c.lede}</p>
            <div className="mt-8">
              <Cta note={`免費建立，只有成交時收 ${fee}%。`} secondary={{ href: "/p/demo", label: "看聽眾會看到什麼" }} />
            </div>
          </div>
          <div className="mx-auto w-[250px] shrink-0 md:w-[290px]">
            <Phone src={c.hero} alt={c.heroAlt} />
          </div>
        </section>

        {/* 了解：這個族群現在的痛 */}
        <section className="sec pb-14" aria-labelledby="pain">
          <Head id="pain" eyebrow="你現在是這樣做的" title={c.painTitle} />
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-3">
            {c.pains.map((p) => (
              <div key={p.t}>
                <h3 className="h3">{p.t}</h3>
                <p className="small mt-2 leading-7">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 感興趣：我們怎麼解 */}
        <section className="sec pb-14" aria-labelledby="fix">
          <Head id="fix" eyebrow="換成這樣" title={c.fixTitle} desc={c.fixDesc} />
          <Screen src={c.screen} alt={c.screenAlt} />
          <div className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-3">
            {c.fixes.map((p) => (
              <div key={p.t}>
                <h3 className="h3">{p.t}</h3>
                <p className="small mt-2 leading-7">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 轉化：這個情境的預設 */}
        <section className="sec pb-14" aria-labelledby="preset">
          <Head id="preset" eyebrow="開箱即用" title="選了這個情境，這些都幫你設好" />
          <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
            <div className="row flex justify-between gap-4 py-3"><span>排隊上限</span><span className="num font-semibold">{k.maxQueue} 首</span></div>
            <div className="row flex justify-between gap-4 py-3"><span>預設金額</span><span className="num font-semibold">{k.amounts.map((a) => `NT$${a}`).join("／")}</span></div>
            <div className="row flex justify-between gap-4 py-3"><span>大螢幕</span><span className="font-semibold">{k.bigScreen ? "預設開啟" : "預設關閉"}</span></div>
            <div className="row flex justify-between gap-4 py-3"><span>列印立牌</span><span className="font-semibold">{k.poster === "standee" ? "直立小卡" : k.poster === "table" ? "桌卡" : "不需要（用連結）"}</span></div>
            <div className="row flex justify-between gap-4 py-3"><span>範例歌單</span><span className="num font-semibold">{k.menu.length} 首</span></div>
            <div className="row flex justify-between gap-4 py-3"><span>收款方式</span><span className="font-semibold">{k.shows.payCode ? "收款碼＋刷卡" : "刷卡金流"}</span></div>
          </div>
          <div className="mt-8"><Cta note="註冊時選一個情境就套用，之後都能改。" secondary={{ href: "/pricing", label: "看方案與費用" }} /></div>
        </section>

        <section className="sec pb-14" aria-labelledby="kfaq">
          <Head id="kfaq" eyebrow="常見問題" title={`${k.name}最常問的`} />
          <Faq items={c.faq.map((f) => ({ q: f.q, a: f.a }))} />
        </section>

        <section className="sec pb-20 md:pb-28">
          <div className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="text-[26px] leading-tight font-extrabold tracking-tight md:text-[34px]">{c.endTitle}</h2>
              <p className="mt-3 max-w-[460px] text-[16px] leading-8 text-ink2">{c.endDesc}</p>
              <div className="mt-7"><Cta note="不用信用卡，不綁約。" /></div>
            </div>
            <Lead />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
