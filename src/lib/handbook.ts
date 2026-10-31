import { HANDBOOK, HANDBOOK_INTRO, type HandbookBlock } from "@/content/handbook";

export type InlineToken =
  { kind: "text"; text: string } | { kind: "bold"; text: string } | { kind: "link"; text: string; href: string };

/** Split handbook text into plain text, **bold** and [link](href) runs. */
export function inlineTokens(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { kind: "bold", text: m[1] } : { kind: "link", text: m[2], href: m[3] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** In the Markdown copy, site paths become full addresses so the file reads well outside the site. */
const mdInline = (text: string, origin: string) =>
  inlineTokens(text)
    .map((t) => (t.kind === "bold" ? `**${t.text}**` : t.kind === "link" ? `[${t.text}](${origin}${t.href})` : t.text))
    .join("");

function mdBlock(b: HandbookBlock, origin: string): string {
  if ("p" in b) return mdInline(b.p, origin);
  if ("tip" in b) return `> ${mdInline(b.tip, origin)}`;
  if ("steps" in b) return b.steps.map((s, i) => `${i + 1}. ${mdInline(s, origin)}`).join("\n");
  return b.list.map((s) => `- ${mdInline(s, origin)}`).join("\n");
}

/** The anchor GitHub gives a heading, so the contents links work there. */
const githubSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");

/** docs/EDITORS_HANDBOOK.md, generated from src/content/handbook.ts. */
export function handbookMarkdown(origin = "https://jhts.unn.edu.ng"): string {
  const parts = [
    "# Editor’s Handbook",
    "<!-- Generated from src/content/handbook.ts by `npm run handbook:generate`. Edit that file, not this one. -->",
    HANDBOOK_INTRO,
    "The same guide is in the editorial office under **Handbook**.",
    "## Contents",
    HANDBOOK.map((s) => `- [${s.title}](#${githubSlug(s.title)})`).join("\n"),
    ...HANDBOOK.flatMap((s) => [`## ${s.title}`, ...s.blocks.map((b) => mdBlock(b, origin))]),
  ];
  return parts.join("\n\n") + "\n";
}
