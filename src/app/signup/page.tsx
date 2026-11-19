import { redirect } from "next/navigation";
import Link from "next/link";
import { homeOf, requireAccount } from "@/lib/auth";
import { APP_NAME } from "@/lib/env";
import { AuthForm } from "../login/AuthForm";

export const metadata = { title: "建立帳號", robots: { index: false } };

export default async function SignUp() {
  const acc = await requireAccount();
  if (acc) redirect(homeOf(acc.performer.accountType));
  return (
    <main className="mx-auto max-w-[400px] px-5 py-16">
      <Link href="/" className="text-[20px] font-bold">{APP_NAME}</Link>
      <AuthForm initial="signup" />
    </main>
  );
}
