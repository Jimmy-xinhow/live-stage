import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { APP_NAME, env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: `管理登入｜${APP_NAME}`, robots: { index: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-[400px] px-5 py-20">
      <a href="/" className="text-[20px] font-bold">{APP_NAME}</a>
      <h1 className="h1 mt-8">平台管理</h1>
      <p className="small mt-1">輸入管理密碼，或用設定為管理員的 LINE 帳號登入後台。</p>
      {error && <p className="mt-4 rounded-[12px] bg-sunken px-3 py-2 text-[14px] text-err">密碼不正確。</p>}
      <form action="/api/admin/login" method="post" className="mt-6 flex flex-col gap-3">
        <label className="field">管理密碼<input type="password" name="password" autoComplete="current-password" /></label>
        <button className="btn btn-primary btn-lg btn-block">登入</button>
      </form>
      {!env.adminPassword && <p className="small mt-4">目前沒有設定 ADMIN_PASSWORD，請用管理員的 LINE 帳號從 <a href="/login" className="underline">表演者登入</a> 進入。</p>}
    </main>
  );
}
