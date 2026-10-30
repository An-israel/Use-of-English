import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/** Crawlers may read everything public, including PDFs for Google Scholar; never accounts or the admin. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/download/", "/api/oai"],
        disallow: ["/admin", "/account", "/submit", "/review", "/auth", "/payments", "/dev", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
