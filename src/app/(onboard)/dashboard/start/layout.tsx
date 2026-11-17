import Link from "next/link";
import { APP_NAME } from "@/lib/env";

/** 引導頁不吃後台的側欄：還沒設定完，側欄上大半連結都還沒意義 */
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="row">
        <div className="wrap flex h-16 items-center gap-3">
          <Link href="/" className="text-[19px] font-bold tracking-wide">{APP_NAME}</Link>
          <span className="small">表演者後台</span>
        </div>
      </header>
      <main className="wrap max-w-[920px] py-10 md:py-14">{children}</main>
    </>
  );
}
