import { handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { API_VERSION, json } from "@/lib/api/public";
import { siteUrl } from "@/lib/env";

/** Index of the public read-only API. */
export const GET = handler(
  async () =>
    json(
      {
        name: "JHTS public API",
        version: API_VERSION,
        licence: "Metadata CC0; article content CC BY 4.0",
        endpoints: {
          issues: `${siteUrl}/api/v1/issues`,
          articles: `${siteUrl}/api/v1/articles?page=1`,
          article: `${siteUrl}/api/v1/articles/{slug}`,
          categories: `${siteUrl}/api/v1/categories`,
        },
      },
      3600,
    ),
  { rateLimit: RATE_LIMITS.publicApi, cors: "public" },
);
