import { afterEach, describe, expect, it, vi } from "vitest";
import { routeCheckFor, routeExists } from "@/lib/route-exists";

/** B1: the proxy answers 404 for missing articles, subjects, policies and issues. */
describe("routeCheckFor", () => {
  it("recognises the content routes", () => {
    expect(routeCheckFor("/articles/a-slug")).toEqual({ kind: "article", slug: "a-slug" });
    expect(routeCheckFor("/subjects/x")).toEqual({ kind: "category", slug: "x" });
    expect(routeCheckFor("/policies/privacy")).toEqual({ kind: "page", slug: "privacy", pageKind: "policy" });
    expect(routeCheckFor("/issues/2/1")).toEqual({ kind: "issue", volume: "2", number: "1" });
  });
  it("leaves everything else alone", () => {
    for (const p of [
      "/",
      "/issues",
      "/issues/current",
      "/articles",
      "/articles/x/opengraph-image",
      "/subjects",
      "/about",
    ])
      expect(routeCheckFor(p)).toBeNull();
  });
});

describe("routeExists", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (rows: unknown[][]) => {
    const fetch = vi.fn();
    for (const r of rows) fetch.mockResolvedValueOnce(new Response(JSON.stringify(r)));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  it("is false without a query for malformed addresses", async () => {
    const fetch = reply([]);
    expect(await routeExists({ kind: "article", slug: "Not A Slug" }, "http://db", "k")).toBe(false);
    expect(await routeExists({ kind: "issue", volume: "x", number: "1" }, "http://db", "k")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is false when neither the item nor a redirect exists", async () => {
    reply([[], []]);
    expect(await routeExists({ kind: "category", slug: "missing-one" }, "http://db", "k")).toBe(false);
  });

  it("is true for a renamed item, so its page can redirect", async () => {
    reply([[], [{ new_slug: "new" }]]);
    expect(await routeExists({ kind: "category", slug: "old-name" }, "http://db", "k")).toBe(true);
  });

  it("remembers what exists", async () => {
    const fetch = reply([[{ slug: "kept" }], []]);
    expect(await routeExists({ kind: "article", slug: "kept" }, "http://db", "k")).toBe(true);
    expect(await routeExists({ kind: "article", slug: "kept" }, "http://db", "k")).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2); // one look-up (two parallel requests), then the cache
  });

  it("fails open when the database can't be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await routeExists({ kind: "page", slug: "privacy", pageKind: "policy" }, "http://db", "k")).toBeNull();
  });
});
