import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^http/, "ws");
// Only upgrade requests when the site itself is served over HTTPS; a local
// production build on http://localhost would otherwise break its own links.
const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://").startsWith("https://");

/**
 * Content Security Policy (items 71, 79). Public pages are statically
 * generated, so per-request nonces are not available; inline scripts are
 * therefore allowed, and XSS is prevented by sanitising every piece of rich
 * text on save and on render. Everything else is locked to known origins.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://js.paystack.co https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://api.paystack.co https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://vitals.vercel-insights.com ${isDev ? "ws://localhost:*" : ""}`,
  "frame-src https://checkout.paystack.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paystack.com",
  "frame-ancestors 'none'",
  !isDev && https ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ")
  .replace(/\s+/g, " ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.paystack.com")',
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Fonts read from disk by the generated Open Graph images.
  outputFileTracingIncludes: { "/**": ["./assets/fonts/*.woff", "./public/brand/emblem-512.png"] },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabase
      ? [{ protocol: "https", hostname: new URL(supabase).hostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Next already serves /_next/static with immutable caching.
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/privacy", destination: "/policies/privacy", permanent: true },
      { source: "/fees-and-payment", destination: "/fees", permanent: true },
      // Feed readers often guess these addresses (I9).
      { source: "/feed", destination: "/rss.xml", permanent: true },
      { source: "/rss", destination: "/rss.xml", permanent: true },
      // The launch subject areas, renamed to the flyer's nine areas of interest.
      ...Object.entries({
        "language-and-linguistics": "language-literature-and-linguistics",
        "literature-and-literary-studies": "language-literature-and-linguistics",
        "translation-studies": "language-literature-and-linguistics",
        "cultural-and-transcultural-studies": "culture-identity-and-transcultural-studies",
        "philosophy-history-and-the-arts": "philosophy-ethics-and-religion",
        "education-and-society": "education-and-pedagogy",
        "other-areas-of-the-humanities": "interdisciplinary-and-applied-research",
      }).map(([from, to]) => ({ source: `/subjects/${from}`, destination: `/subjects/${to}`, permanent: true })),
    ];
  },
};

export default nextConfig;
