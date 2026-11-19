import Link from "next/link";
import { APP_NAME } from "@/lib/env";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "重設密碼", robots: { index: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <main className="mx-auto max-w-[400px] px-5 py-16">
      <Link href="/" className="text-[20px] font-bold">{APP_NAME}</Link>
      {t ? (
        <ResetForm token={t} />
      ) : (
        <>
          <h1 className="h1 mt-8">連結不完整</h1>
          <p className="small mt-2">請從信裡的連結點進來。</p>
          <Link href="/login" className="btn btn-primary btn-lg btn-block mt-8">回登入頁</Link>
        </>
      )}
    </main>
  );
}
