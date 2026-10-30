import { describe, expect, it } from "vitest";
import { needsHtmlMode } from "@/components/admin/RichTextEditor";

describe("needsHtmlMode", () => {
  it("keeps the visual editor for plain rich text", () => {
    expect(
      needsHtmlMode("<h2>Method</h2><p>We <em>recorded</em> <a href='/x'>lessons</a>.</p><ul><li>One</li></ul>"),
    ).toBe(false);
  });
  it("switches to HTML for markup the visual editor would drop", () => {
    expect(needsHtmlMode("<table><tr><td>1</td></tr></table>")).toBe(true);
    expect(needsHtmlMode('<p>Text<sup class="fn" id="r1">1</sup></p>')).toBe(true);
    expect(needsHtmlMode('<p>Reviewers <mark class="to-confirm">[TO CONFIRM]</mark></p>')).toBe(true);
    expect(needsHtmlMode('<p class="signature">Editor-in-Chief</p>')).toBe(true);
  });
});
