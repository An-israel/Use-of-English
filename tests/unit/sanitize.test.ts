import { describe, expect, it } from "vitest";
import { sanitize, sanitizeWithToc } from "@/lib/sanitize";

describe("sanitize", () => {
  it("removes scripts and event handlers", () => {
    const out = sanitize(`<p onclick="x()">Hi<script>alert(1)</script></p><img src="javascript:alert(1)" onerror="x">`);
    expect(out).not.toMatch(/script|onclick|onerror|javascript/);
    expect(out).toContain("<p>Hi</p>");
  });
  it("keeps allowed classes and drops others", () => {
    expect(sanitize(`<span class="sidenote evil">n</span>`)).toBe(`<span class="sidenote">n</span>`);
  });
  it("adds rel to external links", () => {
    expect(sanitize(`<a href="https://example.org">x</a>`)).toContain(`rel="noopener noreferrer"`);
  });
  it("builds a table of contents with unique ids", () => {
    const { html, toc } = sanitizeWithToc(
      "<h2>Introduction</h2><p>x</p><h3>Data &amp; method</h3><h2>Introduction</h2>",
    );
    expect(toc.map((t) => t.id)).toEqual(["introduction", "data-method", "introduction-x"]);
    expect(html).toContain('<h2 id="introduction">');
  });
});
