import { ApiError, handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { articleJson, json } from "@/lib/api/public";
import { getArticles } from "@/lib/data";

const PER_PAGE = 50;

/** Published articles and Articles in Press, newest first; ?page=, ?volume=&issue=, ?in_press=true. */
export const GET = handler(
  async ({ req }) => {
    const sp = req.nextUrl.searchParams;
    const page = Number(sp.get("page") ?? "1");
    if (!Number.isInteger(page) || page < 1)
      throw new ApiError(422, "invalid_page", "page must be a positive integer.");
    const volume = sp.get("volume") ? Number(sp.get("volume")) : null;
    const issue = sp.get("issue") ? Number(sp.get("issue")) : null;
    let rows = await getArticles();
    if (sp.get("in_press") === "true") rows = rows.filter((a) => !a.issue);
    if (volume) rows = rows.filter((a) => a.issue?.volume === volume);
    if (issue) rows = rows.filter((a) => a.issue?.number === issue);
    const total = rows.length;
    return json({
      data: rows.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(articleJson),
      meta: { page, per_page: PER_PAGE, total, pages: Math.max(1, Math.ceil(total / PER_PAGE)) },
    });
  },
  { rateLimit: RATE_LIMITS.publicApi, cors: "public" },
);
