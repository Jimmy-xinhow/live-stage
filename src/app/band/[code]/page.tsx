import { getFanId } from "@/lib/session";
import { getFan } from "@/lib/fans";
import { LIFF_ID, env } from "@/lib/env";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { JoinClient } from "./JoinClient";

export const dynamic = "force-dynamic";

/**
 * 團員用邀請碼加入。
 * 團長不可能知道團員的 LINE ID，所以流程是：團長給連結 → 團員用 LINE 登入 → 綁定。
 */
export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const fan = await getFan(await getFanId());
  return (
    <>
      <SiteHeader />
      <main className="wrap min-h-[60vh] max-w-[560px] py-12">
        <h1 className="h1">加入樂團拆帳</h1>
        <p className="mt-3 leading-7">
          登入之後你就看得到自己在這個團裡每個月分到多少。只看得到自己的數字，看不到別人的。
        </p>
        <p className="small mt-3">
          款項是直接進團長的收款帳戶，這裡只是把帳算清楚——實際的錢由團長分給你。
        </p>
        <JoinClient
          code={code}
          liffId={LIFF_ID}
          devLogin={env.allowDevLogin}
          fan={fan ? { name: fan.name, avatar: fan.avatarUrl } : null}
        />
      </main>
      <SiteFooter />
    </>
  );
}
