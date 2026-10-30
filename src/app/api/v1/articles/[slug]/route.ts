import { ApiError, handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { articleJson, json } from "@/lib/api/public";
import { getArticle } from "@/lib/data";

/** One article with its keywords. */
export const GET = handler<{ slug: string }>(
  async ({ params }) => {
    const a = await getArticle(params.slug);
    if (!a) throw new ApiError(404, "not_found", "No such article.");
    return json({ data: { ...articleJson(a), keywords: a.keywords } });
  },
  { rateLimit: RATE_LIMITS.publicApi, cors: "public" },
);
