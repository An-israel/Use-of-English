import { handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { issueJson, json } from "@/lib/api/public";
import { getIssues } from "@/lib/data";

/** Every published issue, newest first. */
export const GET = handler(async () => json({ data: (await getIssues()).map(issueJson) }), {
  rateLimit: RATE_LIMITS.publicApi,
  cors: "public",
});
