import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { NAV } from "@/lib/nav";

/** robots.txt rules are prefix matches; check none of them blocks a public page by accident. */
const rules = [robots().rules].flat()[0]!;
const disallow = [rules.disallow ?? []].flat();
const allow = [rules.allow ?? []].flat();
// As crawlers apply them: the longest matching rule wins, and Allow wins a tie.
const longest = (list: string[], path: string) =>
  Math.max(-1, ...list.filter((r) => path.startsWith(r)).map((r) => r.length));
const blocked = (path: string) => longest(disallow, path) > longest(allow, path);

describe("robots.txt", () => {
  it("keeps every page in the navigation crawlable", () => {
    // Submitting and the account area are for signed-in people and are meant to be blocked.
    const paths = NAV.flatMap((g) => g.links.map((l) => l.href)).filter(
      (h) => h.startsWith("/") && !["/submit", "/account"].includes(h),
    );
    expect(paths.length).toBeGreaterThan(10);
    expect(paths.filter(blocked)).toEqual([]);
  });

  it("keeps the author guidelines, articles and issues crawlable", () => {
    for (const p of ["/author-guidelines", "/articles/x", "/issues/1/1", "/book-reviews", "/api/download/article/x"])
      expect(blocked(p), p).toBe(false);
  });

  it("blocks private areas", () => {
    for (const p of ["/admin", "/admin/submissions", "/account", "/auth/callback", "/review/x", "/api/health"])
      expect(blocked(p), p).toBe(true);
  });
});
