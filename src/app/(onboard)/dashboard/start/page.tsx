import { redirect } from "next/navigation";
import { requirePerformer } from "@/lib/auth";
import { PageHead } from "@/components/back/Shell";
import { StartForm } from "./StartForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "開始設定", robots: { index: false } };

export default async function Start() {
  const auth = await requirePerformer();
  if (!auth) redirect("/login");
  return (
    <div>
      <PageHead title="先設定一下" desc="兩個問題，設完就可以開演。" />
      <StartForm name={auth.performer.displayName} />
    </div>
  );
}
