import { handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { json } from "@/lib/api/public";
import { getCategories } from "@/lib/data";

/** Subject areas. */
export const GET = handler(
  async () =>
    json(
      {
        data: (await getCategories()).map((c) => ({ slug: c.slug, name: c.name, description: c.shortDescription })),
      },
      3600,
    ),
  { rateLimit: RATE_LIMITS.publicApi, cors: "public" },
);
