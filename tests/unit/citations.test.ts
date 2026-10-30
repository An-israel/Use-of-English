import { describe, expect, it } from "vitest";
import {
  apa,
  apaAuthors,
  bibtex,
  chicago,
  chicagoAuthors,
  initials,
  mla,
  mlaAuthors,
  ris,
  toPlain,
  type Citable,
} from "@/lib/citations";

const J = "Journal of Humanities and Transcultural Studies";
const base: Citable = {
  title: "Code-Switching and Classroom Authority",
  authors: [{ name: "Adaeze N. Okafor" }],
  journal: J,
  volume: 1,
  issue: 2,
  year: 2027,
  firstPage: 1,
  lastPage: 22,
  doi: "10.12345/jhts.2027.0001",
  url: "https://jhts.unn.edu.ng/articles/code-switching",
  inPress: false,
};
const two = { ...base, authors: [{ name: "Adaeze N. Okafor" }, { name: "Tobenna Eze" }] };
const three = {
  ...base,
  authors: [{ name: "Emeka J. Nwosu" }, { name: "Halima Bello" }, { name: "Grace O. Adeyemi" }],
};
const many = (n: number) => ({
  ...base,
  authors: Array.from({ length: n }, (_, i) => ({ name: `Given${i} Family${i}` })),
});
const inPress: Citable = {
  ...base,
  volume: null,
  issue: null,
  firstPage: null,
  lastPage: null,
  inPress: true,
  year: 2028,
  onlineDate: "2028-04-14T09:00:00Z",
};

describe("initials", () => {
  it("abbreviates given names", () => expect(initials("Adaeze N.")).toBe("A. N."));
  it("keeps hyphenated initials", () => expect(initials("Mary-Jane")).toBe("M.-J."));
});

describe("APA 7th", () => {
  it("one author", () =>
    expect(toPlain(apa(base))).toBe(
      `Okafor, A. N. (2027). Code-Switching and Classroom Authority. ${J}, 1(2), 1–22. https://doi.org/10.12345/jhts.2027.0001`,
    ));
  it("italicises journal and volume", () => expect(apa(base)).toContain(`<i>${J}</i>, <i>1</i>(2)`));
  it("two authors use an ampersand", () => expect(apaAuthors(two.authors)).toBe("Okafor, A. N., & Eze, T."));
  it("three authors", () => expect(apaAuthors(three.authors)).toBe("Nwosu, E. J., Bello, H., & Adeyemi, G. O."));
  it("21+ authors use an ellipsis", () => {
    const s = apaAuthors(many(25).authors);
    expect(s).toContain("Family18, G., . . . Family24, G.");
    expect(s).not.toContain("Family19");
  });
  it("in press is an advance online publication", () =>
    expect(toPlain(apa(inPress))).toBe(
      `Okafor, A. N. (2028). Code-Switching and Classroom Authority. ${J}. Advance online publication. https://doi.org/10.12345/jhts.2027.0001`,
    ));
  it("falls back to the URL without a DOI", () => expect(apa({ ...base, doi: null })).toContain(base.url));
});

describe("MLA 9th", () => {
  it("one author", () =>
    expect(toPlain(mla(base))).toBe(
      `Okafor, Adaeze N. “Code-Switching and Classroom Authority.” ${J}, vol. 1, no. 2, 2027, pp. 1–22, https://doi.org/10.12345/jhts.2027.0001.`,
    ));
  it("two authors", () => expect(mlaAuthors(two.authors)).toBe("Okafor, Adaeze N., and Tobenna Eze"));
  it("three or more use et al.", () => expect(toPlain(mla(three))).toMatch(/^Nwosu, Emeka J., et al\. “/));
  it("in press omits volume and pages", () => {
    const s = toPlain(mla(inPress));
    expect(s).not.toContain("vol.");
    expect(s).toContain(`${J}, 2028, https://doi.org/`);
  });
});

describe("Chicago author-date", () => {
  it("one author", () =>
    expect(toPlain(chicago(base))).toBe(
      `Okafor, Adaeze N. 2027. “Code-Switching and Classroom Authority.” ${J} 1 (2): 1–22. https://doi.org/10.12345/jhts.2027.0001.`,
    ));
  it("two authors", () => expect(chicagoAuthors(two.authors)).toBe("Okafor, Adaeze N., and Tobenna Eze"));
  it("three authors", () =>
    expect(chicagoAuthors(three.authors)).toBe("Nwosu, Emeka J., Halima Bello, and Grace O. Adeyemi"));
  it("more than ten authors: first seven then et al.", () => {
    const s = chicagoAuthors(many(12).authors);
    expect(s).toMatch(/Given6 Family6, et al$/);
    expect(s).not.toContain("Family7");
  });
  it("in press notes the online date", () =>
    expect(toPlain(chicago(inPress))).toContain("Published ahead of print, April 14, 2028"));
});

describe("BibTeX and RIS", () => {
  it("BibTeX has a stable key and double-dash pages", () => {
    const b = bibtex(two);
    expect(b).toMatch(/^@article\{okafor2027code,/);
    expect(b).toContain("author = {Okafor, Adaeze N. and Eze, Tobenna}");
    expect(b).toContain("pages = {1--22}");
    expect(b).toContain("doi = {10.12345/jhts.2027.0001}");
  });
  it("BibTeX escapes special characters", () =>
    expect(bibtex({ ...base, title: "Rates & 50% Costs" })).toContain("Rates \\& 50\\% Costs"));
  it("BibTeX in press omits volume", () => {
    const b = bibtex(inPress);
    expect(b).not.toContain("volume");
    expect(b).toContain("note = {Advance online publication}");
  });
  it("RIS lists every author and ends with ER", () => {
    const r = ris(three);
    expect(r.match(/^AU {2}- /gm)).toHaveLength(3);
    expect(r).toContain("SP  - 1\r\nEP  - 22");
    expect(r.trimEnd().endsWith("ER  -")).toBe(true);
  });
});
