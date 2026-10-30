/**
 * OAI-PMH 2.0 data provider (brief section 12) exposing Dublin Core records
 * of published articles and Articles in Press. Pure: the route injects the
 * data access, so every verb and error is unit-tested.
 */
import { el, esc, plain } from "./xml";

export type OaiRecord = {
  id: string;
  slug: string;
  title: string;
  creators: string[];
  subjects: string[];
  description: string;
  publisher: string;
  date: string | null;
  type: string;
  doi: string | null;
  source: string | null;
  datestamp: string; // YYYY-MM-DD
};

export type OaiDeps = {
  baseUrl: string;
  siteUrl: string;
  repositoryName: string;
  adminEmail: string;
  earliest: string;
  domain: string;
  list(q: {
    from: string | null;
    until: string | null;
    offset: number;
    limit: number;
  }): Promise<{ records: OaiRecord[]; total: number }>;
  get(id: string): Promise<OaiRecord | null>;
};

export const PAGE = 100;
const VERBS = ["Identify", "ListMetadataFormats", "ListSets", "ListIdentifiers", "ListRecords", "GetRecord"] as const;
const ALLOWED: Record<string, string[]> = {
  Identify: [],
  ListMetadataFormats: ["identifier"],
  ListSets: ["resumptionToken"],
  ListIdentifiers: ["metadataPrefix", "from", "until", "set", "resumptionToken"],
  ListRecords: ["metadataPrefix", "from", "until", "set", "resumptionToken"],
  GetRecord: ["identifier", "metadataPrefix"],
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const identifier = (domain: string, id: string) => `oai:${domain}:article/${id}`;

function envelope(deps: OaiDeps, request: string, body: string, now: Date) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
<responseDate>${now.toISOString().replace(/\.\d{3}Z$/, "Z")}</responseDate>
${request}
${body}
</OAI-PMH>
`;
}

const error = (code: string, message: string) => `<error code="${code}">${esc(message)}</error>`;

function header(deps: OaiDeps, r: OaiRecord) {
  return `<header>${el("identifier", identifier(deps.domain, r.id))}${el("datestamp", r.datestamp)}</header>`;
}

function dc(deps: OaiDeps, r: OaiRecord) {
  return [
    '<metadata><oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">',
    el("dc:title", r.title),
    ...r.creators.map((c) => el("dc:creator", c)),
    ...r.subjects.map((s) => el("dc:subject", s)),
    el("dc:description", plain(r.description)),
    el("dc:publisher", r.publisher),
    el("dc:date", r.date),
    el("dc:type", "Text"),
    el("dc:type", r.type),
    el("dc:format", "text/html"),
    el("dc:identifier", `${deps.siteUrl}/articles/${r.slug}`),
    r.doi ? el("dc:identifier", `https://doi.org/${r.doi}`) : "",
    el("dc:source", r.source),
    el("dc:language", "en"),
    el("dc:rights", "https://creativecommons.org/licenses/by/4.0/"),
    "</oai_dc:dc></metadata>",
  ].join("");
}

type Token = { o: number; f: string | null; u: string | null };
export const encodeToken = (t: Token) => Buffer.from(JSON.stringify(t)).toString("base64url");
function decodeToken(s: string): Token | null {
  try {
    const t = JSON.parse(Buffer.from(s, "base64url").toString()) as Token;
    return Number.isInteger(t.o) && t.o >= 0 ? t : null;
  } catch {
    return null;
  }
}

/** Answer one OAI-PMH request; returns the XML body (always HTTP 200, errors inside, per the spec). */
export async function oai(params: URLSearchParams, deps: OaiDeps, now = new Date()): Promise<string> {
  const verb = params.get("verb") ?? "";
  const args = Object.fromEntries(params);
  const attrs = (ok: boolean) =>
    ok
      ? Object.entries(args)
          .map(([k, v]) => ` ${k}="${esc(v)}"`)
          .join("")
      : "";
  const request = (ok: boolean) => `<request${attrs(ok)}>${esc(deps.baseUrl)}</request>`;

  if (!(VERBS as readonly string[]).includes(verb))
    return envelope(deps, request(false), error("badVerb", "Illegal or missing verb."), now);
  const extra = Object.keys(args).filter((k) => k !== "verb" && !ALLOWED[verb].includes(k));
  const repeated = [...new Set(params.keys())].some((k) => params.getAll(k).length > 1);
  if (extra.length || repeated)
    return envelope(deps, request(false), error("badArgument", `Illegal or repeated argument for ${verb}.`), now);

  const reply = (body: string) => envelope(deps, request(true), `<${verb}>${body}</${verb}>`, now);
  const fail = (code: string, message: string) => envelope(deps, request(true), error(code, message), now);

  switch (verb) {
    case "Identify":
      return reply(
        [
          el("repositoryName", deps.repositoryName),
          el("baseURL", deps.baseUrl),
          el("protocolVersion", "2.0"),
          el("adminEmail", deps.adminEmail),
          el("earliestDatestamp", deps.earliest),
          el("deletedRecord", "no"),
          el("granularity", "YYYY-MM-DD"),
        ].join(""),
      );
    case "ListMetadataFormats": {
      if (args.identifier && !(await deps.get(args.identifier.split("/").pop() ?? "")))
        return fail("idDoesNotExist", "No such record.");
      return reply(
        "<metadataFormat><metadataPrefix>oai_dc</metadataPrefix><schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema><metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat>",
      );
    }
    case "ListSets":
      return fail("noSetHierarchy", "This repository does not support sets.");
    case "GetRecord": {
      if (!args.identifier || !args.metadataPrefix)
        return fail("badArgument", "identifier and metadataPrefix are required.");
      if (args.metadataPrefix !== "oai_dc") return fail("cannotDisseminateFormat", "Only oai_dc is supported.");
      const prefix = `oai:${deps.domain}:article/`;
      const id = args.identifier.startsWith(prefix) ? args.identifier.slice(prefix.length) : "";
      const r = id ? await deps.get(id) : null;
      if (!r) return fail("idDoesNotExist", "No such record.");
      return reply(`<record>${header(deps, r)}${dc(deps, r)}</record>`);
    }
    default: {
      // ListIdentifiers and ListRecords
      let t: Token;
      if (args.resumptionToken) {
        if (Object.keys(args).length > 2) return fail("badArgument", "resumptionToken is exclusive.");
        const d = decodeToken(args.resumptionToken);
        if (!d) return fail("badResumptionToken", "The resumption token is invalid or expired.");
        t = d;
      } else {
        if (args.metadataPrefix !== "oai_dc")
          return args.metadataPrefix
            ? fail("cannotDisseminateFormat", "Only oai_dc is supported.")
            : fail("badArgument", "metadataPrefix is required.");
        if (args.set) return fail("noSetHierarchy", "This repository does not support sets.");
        if (
          (args.from && !DAY.test(args.from)) ||
          (args.until && !DAY.test(args.until)) ||
          (args.from && args.until && args.from > args.until)
        )
          return fail("badArgument", "from and until must be YYYY-MM-DD, with from before until.");
        t = { o: 0, f: args.from ?? null, u: args.until ?? null };
      }
      const { records, total } = await deps.list({ from: t.f, until: t.u, offset: t.o, limit: PAGE });
      if (!records.length) return fail("noRecordsMatch", "No records match.");
      const items = records
        .map((r) => (verb === "ListRecords" ? `<record>${header(deps, r)}${dc(deps, r)}</record>` : header(deps, r)))
        .join("");
      const next = t.o + records.length;
      const token =
        next < total
          ? `<resumptionToken completeListSize="${total}" cursor="${t.o}">${encodeToken({ ...t, o: next })}</resumptionToken>`
          : t.o > 0
            ? `<resumptionToken completeListSize="${total}" cursor="${t.o}"/>`
            : "";
      return reply(items + token);
    }
  }
}
