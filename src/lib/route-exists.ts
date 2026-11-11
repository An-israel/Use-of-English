/**
 * Does a public article, subject, policy or issue exist? (B1)
 *
 * Content pages stream, and a streamed response has already been sent with
 * status 200 by the time the page finds out the item is missing. The proxy
 * asks this first, so a missing item gets a real 404 that search engines and
 * link checkers understand.
 *
 * Kept small for the proxy: one PostgREST request with the public key (RLS
 * shows only what visitors may see), a positive cache so popular pages don't
 * query at all, and "fail open" — if the database can't be reached, the page
 * renders as before and decides for itself.
 */

export type RouteCheck =
  | { kind: "article" | "category" | "page"; slug: string; pageKind?: "policy" }
  | { kind: "issue"; volume: string; number: string };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const POSITIVE_TTL = 10 * 60_000;
const known = new Map<string, number>();

/** Which check, if any, applies to a public path. */
export function routeCheckFor(path: string): RouteCheck | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "articles") return { kind: "article", slug: parts[1] };
  if (parts.length === 2 && parts[0] === "subjects") return { kind: "category", slug: parts[1] };
  if (parts.length === 2 && parts[0] === "policies") return { kind: "page", slug: parts[1], pageKind: "policy" };
  if (parts.length === 3 && parts[0] === "issues" && parts[1] !== "current")
    return { kind: "issue", volume: parts[1], number: parts[2] };
  return null;
}

function queries(c: RouteCheck): string[] | null {
  if (c.kind === "issue") {
    if (!/^\d{1,4}$/.test(c.volume) || !/^\d{1,3}$/.test(c.number)) return null;
    return [`issues?select=id,volumes!inner(number)&number=eq.${c.number}&volumes.number=eq.${c.volume}&limit=1`];
  }
  if (!SLUG.test(c.slug) || c.slug.length > 200) return null;
  const table = c.kind === "article" ? "articles" : c.kind === "category" ? "categories" : "pages";
  const own = `${table}?select=slug&slug=eq.${c.slug}${c.pageKind ? `&kind=eq.${c.pageKind}` : ""}&limit=1`;
  // A renamed item still answers: its page redirects to the new address.
  const moved = `slug_redirects?select=new_slug&entity=eq.${c.kind}&old_slug=eq.${c.slug}&limit=1`;
  return [own, moved];
}

/** true: exists; false: certainly missing; null: couldn't tell (render as normal). */
export async function routeExists(c: RouteCheck, url: string, key: string): Promise<boolean | null> {
  const q = queries(c);
  if (!q) return false;
  const id = JSON.stringify(c);
  const seen = known.get(id);
  if (seen && Date.now() - seen < POSITIVE_TTL) return true;
  try {
    const signal = AbortSignal.timeout(1500);
    const found = await Promise.all(
      q.map(async (path) => {
        const res = await fetch(`${url}/rest/v1/${path}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: "no-store",
          signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        return ((await res.json()) as unknown[]).length > 0;
      }),
    );
    if (found.some(Boolean)) {
      if (known.size > 5000) known.clear();
      known.set(id, Date.now());
      return true;
    }
    return false;
  } catch {
    return null;
  }
}
