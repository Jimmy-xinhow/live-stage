import { LiffRedirect } from "./LiffRedirect";
import { LIFF_ID } from "@/lib/env";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";

// LIFF Endpoint 設為 {APP_BASE_URL}/p；liff.line.me/{LIFF_ID}/{slug} 會先到這裡，由 liff.init 轉到 /p/{slug}
export default function LiffEntry() {
  if (!FEATURES.discovery) notFound();
  return <LiffRedirect liffId={LIFF_ID} />;
}
