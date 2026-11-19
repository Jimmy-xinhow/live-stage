import { redirect } from "next/navigation";
import Link from "next/link";
import { homeOf, requireAccount } from "@/lib/auth";
import { APP_NAME, env } from "@/lib/env";
import { AuthForm } from "./AuthForm";

export const metadata = { title: "登入", robots: { index: false } };

export default async function Login() {
  const acc = await requireAccount();
  if (acc) redirect(homeOf(acc.performer.accountType));
  return (
    <main className="mx-auto max-w-[400px] px-5 py-16">
      <Link href="/" className="text-[20px] font-bold">{APP_NAME}</Link>
      <AuthForm initial="signin" />
      {env.allowDevLogin && (
        <div className="mt-8 rounded-[16px] border-2 border-dashed border-ink3 p-4">
          <span className="label">開發模式</span>
          <div className="mt-2 flex flex-col gap-2">
            <a href="/api/auth/dev?as=demo" className="btn btn-secondary btn-sm">以示範表演者登入（阿哲）</a>
            <a href="/api/auth/dev?as=demo-mia" className="btn btn-secondary btn-sm">以示範表演者登入（Mia）</a>
          </div>
        </div>
      )}
    </main>
  );
}
