import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { env } from "@/lib/env";

const title = `${BRAND.name}｜${BRAND.tagline}`;
const description = "街頭、駐唱樂團、線上直播都能用的點歌台。聽眾掃碼就能點歌、留言、參加互動，錢直接進你的帳戶，平台不經手。";

export const metadata: Metadata = {
  metadataBase: new URL(env.baseUrl),
  title: { default: title, template: `%s｜${BRAND.name}` },
  description,
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/icon-180.png" },
  openGraph: { title, description, url: env.baseUrl, siteName: BRAND.name, images: [{ url: "/og.png", width: 1200, height: 630 }], locale: "zh_TW", type: "website" },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@500;700;900&family=Iansui&family=Archivo:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-dvh">{children}</body>
    </html>
  );
}
