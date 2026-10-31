import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HANDBOOK } from "@/content/handbook";
import { handbookMarkdown, inlineTokens } from "@/lib/handbook";

describe("Editor's Handbook", () => {
  it("splits bold and links from plain text", () => {
    expect(inlineTokens("Open [Payments](/admin/payments) and choose **Record refund**.")).toEqual([
      { kind: "text", text: "Open " },
      { kind: "link", text: "Payments", href: "/admin/payments" },
      { kind: "text", text: " and choose " },
      { kind: "bold", text: "Record refund" },
      { kind: "text", text: "." },
    ]);
  });

  it("covers what the brief asks for", () => {
    const titles = HANDBOOK.map((s) => s.title);
    for (const t of ["Publishing an issue", "Handling a submission", "Waivers", "Refunds"]) expect(titles).toContain(t);
  });

  it("links only to admin screens that exist", () => {
    const links = HANDBOOK.flatMap((s) => JSON.stringify(s.blocks).match(/\]\((\/[^)]*)\)/g) ?? []);
    for (const l of links) {
      const path = l.slice(2, -1);
      expect(existsSync(`src/app${path}/page.tsx`), path).toBe(true);
    }
  });

  it("docs/EDITORS_HANDBOOK.md is up to date (run npm run handbook:generate)", () => {
    expect(readFileSync("docs/EDITORS_HANDBOOK.md", "utf8")).toBe(handbookMarkdown());
  });
});
