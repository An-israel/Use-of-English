import { describe, expect, it } from "vitest";
import { crossrefDeposit, splitName, suggestDoi } from "@/lib/crossref";
import { esc } from "@/lib/xml";

const base = {
  journal: { title: "Journal of Humanities & Transcultural Studies", abbrev: "JHTS", issn: "1234-567X", eissn: null },
  volume: 1,
  issue: 2,
  year: 2027,
  month: 6,
  depositor: { name: "JHTS Editorial Office", email: "editorial@example.test" },
  registrant: "University of Nigeria, Nsukka",
  batchId: "jhts-v1n2-1",
  timestamp: "20270601120000",
  articles: [
    {
      title: "Proverbs <and> “Pidgin”",
      authors: [
        { name: "Adaeze N. Okafor", affiliation: "UNN", orcid: "0000-0002-1825-0097" },
        { name: "Bayo", affiliation: null, orcid: null },
      ],
      doi: suggestDoi("10.12345", 2027, 1, 2, 3),
      url: "https://jhts.unn.edu.ng/articles/proverbs",
      firstPage: 1,
      lastPage: 22,
      published: "2027-06-15",
      abstract: "<p>An <em>abstract</em>.</p>",
    },
  ],
};

describe("Crossref deposit", () => {
  it("suggests DOIs and splits names", () => {
    expect(suggestDoi("10.12345", 2027, 1, 2, 3)).toBe("10.12345/jhts.2027.1.2.03");
    expect(splitName("Adaeze N. Okafor")).toEqual({ given: "Adaeze N.", surname: "Okafor" });
    expect(splitName("Bayo")).toEqual({ given: "", surname: "Bayo" });
  });
  it("writes a 5.3.1 batch with escaped text", () => {
    const xml = crossrefDeposit(base);
    expect(xml).toContain('<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1"');
    expect(xml).toContain("<full_title>Journal of Humanities &amp; Transcultural Studies</full_title>");
    expect(xml).toContain('<issn media_type="print">1234-567X</issn>');
    expect(xml).toContain("<title>Proverbs &lt;and&gt; “Pidgin”</title>");
    expect(xml).toContain(
      '<person_name sequence="first" contributor_role="author"><given_name>Adaeze N.</given_name><surname>Okafor</surname>',
    );
    expect(xml).toContain('<person_name sequence="additional" contributor_role="author"><surname>Bayo</surname>');
    expect(xml).toContain('<ORCID authenticated="false">https://orcid.org/0000-0002-1825-0097</ORCID>');
    expect(xml).toContain("<jats:p>An abstract.</jats:p>");
    expect(xml).toContain("<pages><first_page>1</first_page><last_page>22</last_page></pages>");
    expect(xml).toContain(
      "<doi>10.12345/jhts.2027.1.2.03</doi><resource>https://jhts.unn.edu.ng/articles/proverbs</resource>",
    );
  });
  it("drops characters XML forbids", () => {
    expect(esc("a\u0001b<")).toBe("ab&lt;");
  });
});
