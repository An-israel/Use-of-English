import { describe, expect, it } from "vitest";
import { cleanPastedHtml } from "@/lib/word-paste";
import { sanitize } from "@/lib/sanitize";

const word = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><style>p.MsoNormal{margin:0}</style></head>
<body><!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
<p class="MsoNormal" style="margin-bottom:0cm;line-height:150%"><span lang="EN-GB" style="font-family:Literata">Language is a <b>bridge</b><o:p></o:p></span></p>
<p class="MsoNormal">&nbsp;</p>
<p class="MsoListParagraph" style="mso-list:l0 level1"><i>Igbo</i>&nbsp;&nbsp;&nbsp;proverbs</p></body></html>`;

describe("cleanPastedHtml", () => {
  it("removes Word markup, styles and empty paragraphs but keeps meaning", () => {
    const out = sanitize(cleanPastedHtml(word));
    expect(out).toContain("<p>Language is a <b>bridge</b></p>");
    expect(out).toContain("<p><i>Igbo</i> proverbs</p>");
    expect(out).not.toMatch(/Mso|style|o:p|mso-|<p>\s*<\/p>|&nbsp;/);
  });
  it("unwraps the Google Docs guid wrapper", () => {
    expect(cleanPastedHtml('<b id="docs-internal-guid-1234"><p>Text</p></b>')).toBe("<p>Text</p>");
  });
});
