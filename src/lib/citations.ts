/**
 * Citations in APA 7th, MLA 9th, Chicago author-date (17th), BibTeX and RIS
 * (brief section 13). Styled formats return HTML using <i> for italics; use
 * `toPlain` for clipboard text without markup.
 */

export type CitableAuthor = { name: string };

export type Citable = {
  title: string;
  authors: CitableAuthor[];
  journal: string;
  issn?: string | null;
  volume?: number | null;
  issue?: number | null;
  /** Year of the issue, or of online publication for Articles in Press */
  year: number;
  firstPage?: number | null;
  lastPage?: number | null;
  doi?: string | null;
  url: string;
  inPress: boolean;
  /** ISO date published online, used for in-press RIS/BibTeX */
  onlineDate?: string | null;
  publisher?: string;
  keywords?: string[];
  abstract?: string;
};

type Name = { family: string; given: string };

/** "Adaeze N. Okafor" → { family: "Okafor", given: "Adaeze N." } */
export function splitName(full: string): Name {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { family: parts[0], given: "" };
  return { family: parts.at(-1)!, given: parts.slice(0, -1).join(" ") };
}

/** "Adaeze N." → "A. N."; "Mary-Jane" → "M.-J." */
export function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((g) =>
      g
        .replace(/\./g, "")
        .split("-")
        .map((p) => `${p[0].toUpperCase()}.`)
        .join("-"),
    )
    .join(" ");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const doiUrl = (doi: string) => `https://doi.org/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")}`;

const pages = (c: Citable, sep = "–") =>
  c.firstPage == null
    ? ""
    : c.lastPage == null || c.lastPage === c.firstPage
      ? `${c.firstPage}`
      : `${c.firstPage}${sep}${c.lastPage}`;

const endWithPeriod = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);

/* ------------------------------------------------------------------ APA 7 */

function apaAuthor(n: Name) {
  return n.given ? `${n.family}, ${initials(n.given)}` : n.family;
}

export function apaAuthors(authors: CitableAuthor[]): string {
  const names = authors.map((a) => apaAuthor(splitName(a.name)));
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length <= 20) return `${names.slice(0, -1).join(", ")}, & ${names.at(-1)}`;
  // 21 or more: first 19, an ellipsis, then the final author
  return `${names.slice(0, 19).join(", ")}, . . . ${names.at(-1)}`;
}

export function apa(c: Citable): string {
  const authors = apaAuthors(c.authors);
  const link = c.doi ? doiUrl(c.doi) : c.url;
  let out = `${esc(authors)} (${c.year}). ${esc(endWithPeriod(c.title))} <i>${esc(c.journal)}</i>`;
  if (c.inPress) {
    out += `. Advance online publication. ${esc(link)}`;
  } else {
    if (c.volume != null) out += `, <i>${c.volume}</i>`;
    if (c.issue != null) out += `(${c.issue})`;
    const p = pages(c);
    if (p) out += `, ${p}`;
    out += `. ${esc(link)}`;
  }
  return out;
}

/* ------------------------------------------------------------------ MLA 9 */

export function mlaAuthors(authors: CitableAuthor[]): string {
  const names = authors.map((a) => splitName(a.name));
  if (names.length === 0) return "";
  const first = names[0].given ? `${names[0].family}, ${names[0].given}` : names[0].family;
  if (names.length === 1) return first;
  if (names.length === 2) return `${first}, and ${[names[1].given, names[1].family].filter(Boolean).join(" ")}`;
  return `${first}, et al`;
}

export function mla(c: Citable): string {
  const authors = endWithPeriod(mlaAuthors(c.authors));
  const title = /[.?!]$/.test(c.title) ? c.title : `${c.title}.`;
  const parts = [`<i>${esc(c.journal)}</i>`];
  if (!c.inPress) {
    if (c.volume != null) parts.push(`vol. ${c.volume}`);
    if (c.issue != null) parts.push(`no. ${c.issue}`);
  }
  parts.push(String(c.year));
  const p = pages(c);
  if (!c.inPress && p) parts.push(`${c.firstPage === c.lastPage || c.lastPage == null ? "p." : "pp."} ${p}`);
  parts.push(c.doi ? doiUrl(c.doi) : c.url.replace(/^https?:\/\//, ""));
  return `${esc(authors)} “${esc(title)}” ${parts.join(", ")}.`;
}

/* ------------------------------------------------- Chicago author-date 17 */

export function chicagoAuthors(authors: CitableAuthor[]): string {
  const names = authors.map((a) => splitName(a.name));
  if (names.length === 0) return "";
  const inverted = names[0].given ? `${names[0].family}, ${names[0].given}` : names[0].family;
  const rest = names.slice(1).map((n) => [n.given, n.family].filter(Boolean).join(" "));
  if (names.length === 1) return inverted;
  if (names.length > 10) return `${[inverted, ...rest.slice(0, 6)].join(", ")}, et al`;
  if (names.length === 2) return `${inverted}, and ${rest[0]}`;
  return `${[inverted, ...rest.slice(0, -1)].join(", ")}, and ${rest.at(-1)}`;
}

export function chicago(c: Citable): string {
  const authors = endWithPeriod(chicagoAuthors(c.authors));
  const title = /[.?!]$/.test(c.title) ? c.title : `${c.title}.`;
  let out = `${esc(authors)} ${c.year}. “${esc(title)}” <i>${esc(c.journal)}</i>`;
  if (c.inPress) {
    out += `. Published ahead of print`;
    if (c.onlineDate)
      out += `, ${new Date(c.onlineDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Africa/Lagos" })}`;
  } else {
    if (c.volume != null) out += ` ${c.volume}`;
    if (c.issue != null) out += ` (${c.issue})`;
    const p = pages(c);
    if (p) out += `: ${p}`;
  }
  return `${out}. ${c.doi ? doiUrl(c.doi) : c.url}.`;
}

/* ------------------------------------------------------- BibTeX and RIS */

export function citationKey(c: Citable): string {
  const family = c.authors[0] ? splitName(c.authors[0].name).family : "anon";
  const word = c.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .find((w) => w.length > 3 && !["the", "and", "with", "from"].includes(w));
  return `${family
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")}${c.year}${word ?? ""}`;
}

const bibEscape = (s: string) => s.replace(/([&%$#_{}])/g, "\\$1");

export function bibtex(c: Citable): string {
  const fields: [string, string | number | null | undefined][] = [
    [
      "author",
      c.authors
        .map((a) => {
          const n = splitName(a.name);
          return n.given ? `${n.family}, ${n.given}` : n.family;
        })
        .join(" and "),
    ],
    ["title", `{${c.title}}`],
    ["journal", c.journal],
    ["year", c.year],
    ["volume", c.inPress ? null : c.volume],
    ["number", c.inPress ? null : c.issue],
    ["pages", c.inPress ? null : pages(c, "--") || null],
    ["issn", c.issn],
    ["doi", c.doi],
    ["url", c.url],
    ["note", c.inPress ? "Advance online publication" : null],
    ["keywords", c.keywords?.length ? c.keywords.join(", ") : null],
  ];
  const body = fields
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `  ${k} = {${k === "title" ? `{${bibEscape(String(v).slice(1, -1))}}` : bibEscape(String(v))}}`)
    .join(",\n");
  return `@article{${citationKey(c)},\n${body}\n}\n`;
}

export function ris(c: Citable): string {
  const lines: string[] = ["TY  - JOUR"];
  for (const a of c.authors) {
    const n = splitName(a.name);
    lines.push(`AU  - ${n.given ? `${n.family}, ${n.given}` : n.family}`);
  }
  lines.push(`TI  - ${c.title}`, `T2  - ${c.journal}`, `JO  - ${c.journal}`, `PY  - ${c.year}`);
  if (c.onlineDate) lines.push(`DA  - ${c.onlineDate.slice(0, 10).replace(/-/g, "/")}`);
  if (!c.inPress) {
    if (c.volume != null) lines.push(`VL  - ${c.volume}`);
    if (c.issue != null) lines.push(`IS  - ${c.issue}`);
    if (c.firstPage != null) lines.push(`SP  - ${c.firstPage}`);
    if (c.lastPage != null) lines.push(`EP  - ${c.lastPage}`);
  }
  if (c.issn) lines.push(`SN  - ${c.issn}`);
  if (c.publisher) lines.push(`PB  - ${c.publisher}`);
  if (c.doi) lines.push(`DO  - ${c.doi}`);
  lines.push(`UR  - ${c.url}`);
  for (const k of c.keywords ?? []) lines.push(`KW  - ${k}`);
  if (c.abstract) lines.push(`AB  - ${c.abstract}`);
  lines.push("ER  - ");
  return lines.join("\r\n") + "\r\n";
}

/** Strip the HTML used for italics, for clipboard text. */
export function toPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export const STYLES = [
  { id: "apa", label: "APA 7th", format: apa },
  { id: "mla", label: "MLA 9th", format: mla },
  { id: "chicago", label: "Chicago", format: chicago },
] as const;
