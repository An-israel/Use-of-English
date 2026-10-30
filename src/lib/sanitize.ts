import sanitizeHtml from "sanitize-html";

/**
 * Rich text is sanitised on save and again on render (item 79). Only the
 * markup the editor produces is allowed; scripts, styles, event handlers and
 * unknown URL schemes are removed.
 */

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h2",
    "h3",
    "h4",
    "em",
    "strong",
    "i",
    "b",
    "u",
    "s",
    "sup",
    "sub",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "figure",
    "figcaption",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "caption",
    "hr",
    "br",
    "span",
    "mark",
    "code",
    "abbr",
    "cite",
    "q",
    "small",
  ],
  allowedAttributes: {
    a: ["href", "title", "id", "rel"],
    img: ["src", "alt", "width", "height"],
    span: ["class", "id", "data-n"],
    mark: ["class"],
    p: ["class"],
    sup: ["id", "class"],
    li: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    abbr: ["title"],
    th: ["scope", "colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["class", "start"],
  },
  allowedClasses: {
    span: ["sidenote", "sidenote-ref"],
    mark: ["to-confirm"],
    p: ["signature", "lede"],
    sup: ["fn"],
    ol: ["footnotes"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href ?? "");
      return { tagName, attribs: external ? { ...attribs, rel: "noopener noreferrer" } : attribs };
    },
  },
};

export function sanitize(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}

export type TocEntry = { id: string; text: string; level: 2 | 3 };

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

/** Sanitise and give every h2/h3 an id, returning a table of contents. */
export function sanitizeWithToc(html: string | null | undefined): { html: string; toc: TocEntry[] } {
  const clean = sanitize(html);
  const toc: TocEntry[] = [];
  const used = new Set<string>();
  const out = clean.replace(/<h([23])(?: id="[^"]*")?>([\s\S]*?)<\/h\1>/g, (_m, level: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    let id = slug(text) || "section";
    while (used.has(id)) id += "-x";
    used.add(id);
    toc.push({ id, text, level: Number(level) as 2 | 3 });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}
