import { describe, expect, it } from "vitest";
import { demoSource } from "@/lib/data/demo";

describe("demo search", () => {
  it("ranks title matches first and highlights them", async () => {
    const r = await demoSource.search({ q: "proverbs" });
    expect(r.hits[0].article.slug).toBe("translating-proverbs-loss-and-gain");
    expect(r.hits[0].titleHtml).toContain("<mark>Proverbs</mark>");
  });
  it("requires every term", async () => {
    expect((await demoSource.search({ q: "proverbs nollywood zebra" })).total).toBe(0);
  });
  it("filters by type, author and year", async () => {
    expect((await demoSource.search({ type: "book_review" })).total).toBe(3);
    expect((await demoSource.search({ author: "okafor" })).hits[0].article.slug).toBe(
      "code-switching-and-authority-in-nsukka-classrooms",
    );
    expect((await demoSource.search({ year: 2028 })).hits.every((h) => (h.article.issue?.year ?? 2028) === 2028)).toBe(
      true,
    );
  });
  it("escapes HTML in highlights", async () => {
    const r = await demoSource.search({ q: "hashtags" });
    expect(r.hits[0].snippetHtml).not.toMatch(/<(?!\/?mark>)/);
  });
});
