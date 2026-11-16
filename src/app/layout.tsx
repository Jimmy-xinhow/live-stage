import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.baseUrl),
  title: APP_NAME,
  description: "找現場表演、邀請表演者，到了現場用手機點歌、打賞、一起玩",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f1ea",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Archivo:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-dvh">{children}</body>
    </html>
  );
}
