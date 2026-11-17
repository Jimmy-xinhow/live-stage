import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // 開發指示器會擋住截圖的左下角，產品畫面要乾淨
  devIndicators: false,
};

export default nextConfig;
