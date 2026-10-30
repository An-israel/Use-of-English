/** Helpers for admin list pages: search terms safe for PostgREST filters, and paging. */

export const ADMIN_PAGE_SIZE = 25;

/** Strip characters that have meaning inside a PostgREST `or=(…)` filter. */
export function searchTerm(q: string | undefined): string | null {
  const t = (q ?? "")
    .replace(/[%*,()\\:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return t.length ? t : null;
}

export function pageOf(p: string | undefined): number {
  const n = Number(p);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function range(page: number, size = ADMIN_PAGE_SIZE): [number, number] {
  return [(page - 1) * size, page * size - 1];
}

/** Rebuild a list URL with some parameters changed (null removes one). */
export function withParams(
  base: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | null>,
) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) if (v) u.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) u.delete(k);
    else u.set(k, v);
  }
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}
