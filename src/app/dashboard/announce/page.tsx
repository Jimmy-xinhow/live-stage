import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { planIsPaid } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";
import { PageHead } from "@/components/back/Shell";
import { Poster } from "./Poster";
import { track } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function Announce() {
  const { performer: p } = (await requireAccount())!;
  if (!planIsPaid(effectivePlan(p)))
    return (
      <div className="flex max-w-[620px] flex-col gap-5">
        <PageHead title="開演公告" desc="一鍵做出可以直接貼 IG 限動的開演圖，含你的點歌 QR。" />
        <div className="card p-5">
          <p className="leading-7">
            這是<strong>點歌台方案</strong>以上的功能。填時間和地點就會產生 1080×1920 的圖，
            右下角是你的點歌 QR，觀眾掃了直接進歌單。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/plan" className="btn btn-now">看方案</Link>
            <Link href="/pricing" className="btn btn-secondary">方案包含什麼</Link>
          </div>
        </div>
      </div>
    );

  track("poster_open", p.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHead title="開演公告" desc="填時間和地點，按下載就有一張可以直接貼 IG 限動的圖。圖上的 QR 就是你的點歌連結。" />
      <Poster slug={p.slug} name={p.displayName} defaultWhere={p.district || ""} />
    </div>
  );
}
