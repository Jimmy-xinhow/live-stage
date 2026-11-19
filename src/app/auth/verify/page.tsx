import Link from "next/link";
import { verifyEmail } from "@/lib/auth";
import { APP_NAME } from "@/lib/env";

export const metadata = { title: "確認信箱", robots: { index: false } };

export default async function Verify({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const p = t ? await verifyEmail(t) : null;
  return (
    <main className="mx-auto max-w-[400px] px-5 py-20">
      <Link href="/" className="text-[20px] font-bold">{APP_NAME}</Link>
      <h1 className="h1 mt-8">{p ? "信箱確認好了" : "這條連結沒有用"}</h1>
      <p className="small mt-2">
        {p
          ? "之後忘記密碼，我們就有辦法把帳號還給你。"
          : "連結可能已經過期（七天）或已經用過了。重新登入後可以再寄一封。"}
      </p>
      <Link href={p ? "/dashboard" : "/login"} className="btn btn-primary btn-lg btn-block mt-8">
        {p ? "回後台" : "回登入頁"}
      </Link>
    </main>
  );
}
