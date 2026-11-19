import { SiteFooter, SiteHeader } from "@/components/Site";
import { JoinClient } from "./JoinClient";

export const dynamic = "force-dynamic";

/**
 * 團員用邀請碼加入。
 * 團長手上沒有團員的任何帳號資訊，所以流程是：團長給連結 → 團員點開認領 → 這台裝置記住。
 */
export default async function Join({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <SiteHeader />
      <main className="wrap min-h-[60vh] max-w-[560px] py-12">
        <h1 className="h1">加入樂團拆帳</h1>
        <p className="mt-3 leading-7">
          點一下就好，不用註冊也不用登入。加入之後你看得到自己在這個團裡每個月分到多少——
          只有自己的數字，看不到其他團員的。
        </p>
        <p className="small mt-3">
          款項是直接進團長的收款帳戶，這裡只是把帳算清楚——實際的錢由團長分給你。
        </p>
        <JoinClient code={code} />
      </main>
      <SiteFooter />
    </>
  );
}
