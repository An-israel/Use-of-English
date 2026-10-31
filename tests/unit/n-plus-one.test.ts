import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Item 27: the archive, issue and article data are each fetched in a fixed,
 * small number of queries (nested selects), never one query per article.
 * Runs against the local Supabase stack when it is configured; skipped otherwise.
 */
const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function countRequests<T>(fn: () => Promise<T>): Promise<{ result: T; requests: number }> {
  const real = globalThis.fetch;
  let requests = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("/rest/v1/")) requests++;
    return real(input, init);
  });
  const result = await fn();
  vi.unstubAllGlobals();
  return { result, requests };
}

describe.skipIf(!configured)("no N+1 queries", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads an issue with all its articles, authors and categories in at most two queries", async () => {
    const { supabaseSource } = await import("@/lib/data/supabase");
    const { result, requests } = await countRequests(() => supabaseSource.issue(1, 1));
    expect(result?.articles.length).toBeGreaterThan(1);
    expect(result?.articles.every((a) => a.authors.length > 0)).toBe(true);
    expect(requests).toBeLessThanOrEqual(2);
  });

  it("loads the archive and the full article list in one query each, however many articles there are", async () => {
    const { supabaseSource } = await import("@/lib/data/supabase");
    const issues = await countRequests(() => supabaseSource.issues());
    expect(issues.result.length).toBeGreaterThan(1);
    expect(issues.requests).toBe(1);
    const articles = await countRequests(() => supabaseSource.articles());
    expect(articles.result.length).toBeGreaterThan(5);
    expect(articles.requests).toBe(1);
  });

  it("loads one article with its authors, issue and book details in a fixed number of queries", async () => {
    const { supabaseSource } = await import("@/lib/data/supabase");
    const { result, requests } = await countRequests(() =>
      supabaseSource.article("code-switching-and-authority-in-nsukka-classrooms"),
    );
    expect(result?.authors.length).toBeGreaterThan(0);
    expect(requests).toBeLessThanOrEqual(3);
  });
});
