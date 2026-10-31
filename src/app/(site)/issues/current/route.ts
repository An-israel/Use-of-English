import { NextResponse, type NextRequest } from "next/server";
import { getIssues } from "@/lib/data";
import { issuePath } from "@/lib/issues";

/**
 * /issues/current always points at the latest published issue. A plain HTTP
 * redirect: unlike a redirect() inside a streamed page, there is no stream for
 * a slow or dropped connection to cut short, and crawlers see a real 307.
 */
export async function GET(req: NextRequest) {
  const [latest] = await getIssues();
  return NextResponse.redirect(new URL(latest ? issuePath(latest) : "/issues", req.url), {
    status: 307,
    headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" },
  });
}
