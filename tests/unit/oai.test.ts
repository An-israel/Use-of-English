import { describe, expect, it } from "vitest";
import { PAGE, oai, type OaiDeps, type OaiRecord } from "@/lib/oai";

const rec = (n: number): OaiRecord => ({
  id: `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`,
  slug: `article-${n}`,
  title: `Article ${n} & more`,
  creators: ["Adaeze Okafor", "Bayo Ade"],
  subjects: ["Igbo", "proverbs"],
  description: "<p>An abstract.</p>",
  publisher: "UNN",
  date: "2027-03-28",
  type: "Research Article",
  doi: n === 1 ? "10.12345/jhts.2027.1.1.01" : null,
  source: "JHTS, Vol. 1 No. 1 (2027)",
  datestamp: "2027-03-28",
});
const all = Array.from({ length: PAGE + 5 }, (_, i) => rec(i + 1));
const deps: OaiDeps = {
  baseUrl: "https://jhts.example/api/oai",
  siteUrl: "https://jhts.example",
  repositoryName: "JHTS",
  adminEmail: "editorial@example.test",
  earliest: "2027-03-28",
  domain: "jhts.example",
  list: async ({ from, offset, limit }) => {
    const rows = from && from > "2027-03-28" ? [] : all;
    return { records: rows.slice(offset, offset + limit), total: rows.length };
  },
  get: async (id) => all.find((r) => r.id === id) ?? null,
};
const q = (s: string) => oai(new URLSearchParams(s), deps, new Date("2027-04-01T10:00:00Z"));

describe("OAI-PMH", () => {
  it("identifies the repository", async () => {
    const x = await q("verb=Identify");
    expect(x).toContain('<request verb="Identify">https://jhts.example/api/oai</request>');
    expect(x).toContain("<protocolVersion>2.0</protocolVersion>");
    expect(x).toContain("<granularity>YYYY-MM-DD</granularity>");
  });
  it("reports protocol errors", async () => {
    expect(await q("verb=Nope")).toContain('<error code="badVerb">');
    expect(await q("verb=Identify&x=1")).toContain('<error code="badArgument">');
    expect(await q("verb=ListRecords")).toContain('<error code="badArgument">');
    expect(await q("verb=ListRecords&metadataPrefix=marc")).toContain('<error code="cannotDisseminateFormat">');
    expect(await q("verb=ListSets")).toContain('<error code="noSetHierarchy">');
    expect(await q("verb=ListRecords&metadataPrefix=oai_dc&from=2030-01-01")).toContain(
      '<error code="noRecordsMatch">',
    );
    expect(await q("verb=ListRecords&resumptionToken=garbage!")).toContain('<error code="badResumptionToken">');
    expect(await q("verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:jhts.example:article/missing")).toContain(
      '<error code="idDoesNotExist">',
    );
  });
  it("returns Dublin Core records", async () => {
    const x = await q(`verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:jhts.example:article/${rec(1).id}`);
    expect(x).toContain("<dc:title>Article 1 &amp; more</dc:title>");
    expect(x).toContain("<dc:creator>Adaeze Okafor</dc:creator><dc:creator>Bayo Ade</dc:creator>");
    expect(x).toContain("<dc:identifier>https://doi.org/10.12345/jhts.2027.1.1.01</dc:identifier>");
    expect(x).toContain("<dc:description>An abstract.</dc:description>");
  });
  it("pages with a resumption token", async () => {
    const first = await q("verb=ListIdentifiers&metadataPrefix=oai_dc");
    expect(first.match(/<header>/g)).toHaveLength(PAGE);
    const token = first.match(/<resumptionToken completeListSize="105" cursor="0">([^<]+)</)![1];
    const second = await q(`verb=ListIdentifiers&resumptionToken=${token}`);
    expect(second.match(/<header>/g)).toHaveLength(5);
    expect(second).toContain('<resumptionToken completeListSize="105" cursor="100"/>');
  });
});
