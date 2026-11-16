import Link from "next/link";
import type { Metadata } from "next";
import { areaCounts } from "@/lib/discover";
import { REGIONS } from "@/lib/areas";
import { APP_NAME } from "@/lib/env";
import { JsonLd, breadcrumb } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/Site";

// 即時資料（誰正在表演），每次請求產生；也避免建置時需要連資料庫
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `全台 22 縣市表演者與現場演出｜${APP_NAME}`,
  description: "依縣市找街頭藝人、駐唱歌手、樂團、DJ、魔術與主持：看誰正在演出、演出地點與行程，也可以直接送出演出邀約。",
  alternates: { canonical: "/area" },
};

export default async function AreaIndex() {
  const areas = await areaCounts();
  return (
    <>
      <SiteHeader />
      <main className="wrap pb-10">
        <JsonLd data={breadcrumb([{ name: APP_NAME, path: "/" }, { name: "全台表演者", path: "/area" }])} />
        <nav aria-label="麵包屑" className="small py-4"><Link href="/" className="underline">首頁</Link> › 全台縣市</nav>
        <h1 className="h1">依縣市找表演</h1>
        <p className="small mt-1">選一個縣市，看現在誰在演出、在哪裡、可以邀請誰。</p>
        {REGIONS.map((r) => (
          <section key={r} className="sec mt-8">
            <h2 className="h2">{r}</h2>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 md:grid-cols-4">
              {areas.filter((a) => a.region === r).map((a) => (
                <li key={a.slug} className="row">
                  <Link href={`/area/${a.slug}`} className="flex min-h-[56px] items-center justify-between gap-2 py-2">
                    <strong>{a.name}</strong>
                    <span className="small num flex items-center gap-1.5">{a.live ? <><span className="dot-now" />{a.live} 演出中・</> : null}{a.performers} 位</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
