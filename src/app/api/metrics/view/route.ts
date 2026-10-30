import { NextResponse, after } from "next/server";
import { z } from "zod";
import { handler, parseJson } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { recordMetric } from "@/lib/metrics";
import { publicClient } from "@/lib/supabase/clients";

/**
 * Article view beacon, sent once per page load by the article page. The
 * database keeps one view per reader per article per day; bots are skipped.
 */
export const POST = handler(
  async ({ req }) => {
    const { article } = await parseJson(req, z.object({ article: z.uuid() }));
    const headers = new Headers(req.headers);
    after(async () => {
      // Only public articles count (RLS hides drafts from the anonymous client).
      const { data } = await publicClient().from("articles").select("id").eq("id", article).maybeSingle();
      if (data) await recordMetric(headers, { kind: "view", articleId: article, format: "html" });
    });
    return new NextResponse(null, { status: 204 });
  },
  { rateLimit: RATE_LIMITS.publicApi },
);
