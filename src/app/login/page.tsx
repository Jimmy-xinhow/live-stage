import { redirect } from "next/navigation";
import { homeOf, requireAccount } from "@/lib/auth";
import { APP_NAME, env } from "@/lib/env";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const acc = await requireAccount();
  if (acc) redirect(homeOf(acc.performer.accountType));
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-[400px] px-5 py-20">
      <a href="/" className="text-[20px] font-bold">{APP_NAME}</a>
      <h1 className="h1 mt-8">表演者與主辦登入</h1>
      <p className="small mt-1">用 LINE 登入。第一次登入自動開通，並送 200 點。</p>
      {error && <p className="mt-4 rounded-[12px] bg-sunken px-3 py-2 text-[14px] text-err">登入失敗，請再試一次。</p>}
      <div className="mt-8 flex flex-col gap-3">
        <a href="/api/auth/line" className="btn btn-primary btn-lg btn-block">我是表演者，用 LINE 登入</a>
        <a href="/api/auth/line?as=org" className="btn btn-secondary btn-lg btn-block">我是店家或主辦，用 LINE 登入</a>
      </div>
      <p className="small mt-3">表演者：建立作品頁、現場點歌與互動。店家或主辦：刊登演出活動、標記演出者、買活動曝光。</p>
      {env.allowDevLogin && (
        <div className="mt-6 rounded-[16px] border-2 border-dashed border-ink3 p-4">
          <span className="label">開發模式</span>
          <div className="mt-2 flex flex-col gap-2">
            <a href="/api/auth/dev?as=demo" className="btn btn-secondary btn-sm">以示範表演者登入（阿哲）</a>
            <a href="/api/auth/dev?as=demo-mia" className="btn btn-secondary btn-sm">以示範表演者登入（Mia）</a>
            <a href="/api/auth/dev?org=1" className="btn btn-secondary btn-sm">以示範主辦登入</a>
          </div>
        </div>
      )}
    </main>
  );
}
