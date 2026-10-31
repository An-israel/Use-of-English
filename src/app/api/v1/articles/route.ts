import { ApiError, handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { articleJson, json } from "@/lib/api/public";
import { getArticles } from "@/lib/data";
import { z } from "zod";

const PER_PAGE = 50;

const count = (name: string) =>
  z.coerce
    .number(`${name} must be a positive integer.`)
    .int(`${name} must be a positive integer.`)
    .positive(`${name} must be a positive integer.`);
const Query = z.object({
  page: count("page").default(1),
  volume: count("volume").optional(),
  issue: count("issue").optional(),
  in_press: z.enum(["true", "false"], "in_press must be true or false.").optional(),
});

/** Published articles and Articles in Press, newest first; ?page=, ?volume=&issue=, ?in_press=true. */
export const GET = handler(
  async ({ req }) => {
    const q = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!q.success) throw new ApiError(422, "invalid_query", q.error.issues.map((i) => i.message).join(" "));
    const { page, volume, issue, in_press } = q.data;
    let rows = await getArticles();
    if (in_press === "true") rows = rows.filter((a) => !a.issue);
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
