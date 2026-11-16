"use client";

import { useEffect } from "react";
import { initLiff } from "@/lib/liff-client";

export function LiffRedirect({ liffId }: { liffId: string }) {
  useEffect(() => {
    initLiff(liffId).then(() => {
      // liff.init 會自動處理 liff.state 轉址；沒有的話回首頁
      setTimeout(() => {
        if (location.pathname === "/p") location.replace("/");
      }, 1500);
    });
  }, [liffId]);
  return <main className="small grid min-h-dvh place-items-center">載入中</main>;
}
