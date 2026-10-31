/**
 * Crossref deposit XML for one issue (brief section 12, schema 5.3.1). It is
 * exported for manual deposit; nothing is sent until JHTS has a Crossref
 * membership. Pure, so the output is unit-tested.
 */
import { el, esc, plain } from "./xml";

export type CrossrefAuthor = { name: string; affiliation: string | null; orcid: string | null };
export type CrossrefArticle = {
  title: string;
  authors: CrossrefAuthor[];
  doi: string;
  url: string;
  firstPage: number | null;
  lastPage: number | null;
  /** YYYY-MM-DD */
  published: string;
  abstract: string;
};
export type CrossrefIssue = {
  journal: { title: string; abbrev: string; issn: string | null; eissn: string | null };
  volume: number;
  issue: number;
  year: number;
  month: number;
  articles: CrossrefArticle[];
  depositor: { name: string; email: string };
  registrant: string;
  batchId: string;
  /** Crossref wants a number that increases with every deposit */
  timestamp: string;
};

/** "10.12345/jhts.2027.1.2.03" for the third article of Vol. 1 No. 2 (2027). */
export function suggestDoi(prefix: string, year: number, volume: number, issue: number, position: number): string {
  return `${prefix}/jhts.${year}.${volume}.${issue}.${String(position).padStart(2, "0")}`;
}

export function splitName(name: string): { given: string; surname: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { given: "", surname: parts[0] };
  return { given: parts.slice(0, -1).join(" "), surname: parts.at(-1)! };
}

function date(iso: string) {
  const [y, m, d] = iso.split("-");
  return `<publication_date media_type="online"><month>${m}</month><day>${d}</day><year>${y}</year></publication_date>`;
}

export function crossrefDeposit(x: CrossrefIssue): string {
  const issn = [
    x.journal.issn ? `<issn media_type="print">${esc(x.journal.issn)}</issn>` : "",
    x.journal.eissn ? `<issn media_type="electronic">${esc(x.journal.eissn)}</issn>` : "",
  ].join("");
  const articles = x.articles
    .map((a) => {
      const people = a.authors
        .map((p, i) => {
          const n = splitName(p.name);
          return [
            `<person_name sequence="${i === 0 ? "first" : "additional"}" contributor_role="author">`,
            el("given_name", n.given),
            el("surname", n.surname),
            p.affiliation
              ? `<affiliations><institution>${el("institution_name", p.affiliation)}</institution></affiliations>`
              : "",
            p.orcid ? el("ORCID", `https://orcid.org/${p.orcid}`, 'authenticated="false"') : "",
            "</person_name>",
          ].join("");
        })
        .join("");
      return [
        '<journal_article publication_type="full_text">',
        `<titles>${el("title", a.title)}</titles>`,
        people ? `<contributors>${people}</contributors>` : "",
        a.abstract ? `<jats:abstract><jats:p>${esc(plain(a.abstract))}</jats:p></jats:abstract>` : "",
        date(a.published),
        a.firstPage ? `<pages>${el("first_page", a.firstPage)}${el("last_page", a.lastPage)}</pages>` : "",
        `<doi_data>${el("doi", a.doi)}${el("resource", a.url)}</doi_data>`,
        "</journal_article>",
      ].join("");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
<head>${el("doi_batch_id", x.batchId)}${el("timestamp", x.timestamp)}<depositor>${el("depositor_name", x.depositor.name)}${el("email_address", x.depositor.email)}</depositor>${el("registrant", x.registrant)}</head>
<body>
<journal>
<journal_metadata language="en">${el("full_title", x.journal.title)}${el("abbrev_title", x.journal.abbrev)}${issn}</journal_metadata>
<journal_issue><publication_date media_type="online"><month>${String(x.month).padStart(2, "0")}</month><year>${x.year}</year></publication_date><journal_volume>${el("volume", x.volume)}</journal_volume>${el("issue", x.issue)}</journal_issue>
${articles}
</journal>
</body>
</doi_batch>
`;
}
