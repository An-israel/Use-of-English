import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs before every non-static request. It is kept small for fast cold
 * starts (item 89):
 *  - gives each request an id that flows into every log line;
 *  - refreshes the Supabase session cookie on signed-in areas;
 *  - sends visitors without a session away from /admin, /account, /submit and /review.
 * Role checks happen on the server in each area's layout and in RLS.
 */

const PROTECTED = ["/admin", "/account", "/submit", "/review"];
const SESSION_AREAS = [...PROTECTED, "/login", "/register", "/auth"];

export async function proxy(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const headers = new Headers(req.headers);
  headers.set("x-request-id", requestId);

  let res = NextResponse.next({ request: { headers } });
  res.headers.set("x-request-id", requestId);

  const path = req.nextUrl.pathname;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !SESSION_AREAS.some((p) => path === p || path.startsWith(p + "/"))) {
    return res;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: { headers } });
        res.headers.set("x-request-id", requestId);
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|rss.xml|.*\\.(?:svg|png|jpg|jpeg|webp|avif|woff2)$).*)",
  ],
};
