import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/o/", "/mock-pay", "/me", "/login", "/live/", "/overlay/", "/find", "/invite?"] }],
    sitemap: `${env.baseUrl}/sitemap.xml`,
    host: env.baseUrl,
  };
}
