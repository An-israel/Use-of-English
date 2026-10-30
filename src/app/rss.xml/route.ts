import { getArticles, getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { joinNames } from "@/lib/format";
import { issueLabel } from "@/lib/issues";
import { ARTICLE_TYPE_LABEL } from "@/lib/types";
import { el, esc } from "@/lib/xml";

/** RSS 2.0: the 30 newest articles and Articles in Press (brief section 12). */
export async function GET() {
  const [articles, s] = await Promise.all([getArticles(), getSettings()]);
  const items = articles
    .slice(0, 30)
    .map((a) => {
      const url = `${siteUrl}/articles/${a.slug}`;
      const date = a.publishedAt ?? a.onlineAt;
      return [
        "<item>",
        el("title", a.title),
        el("link", url),
        `<guid isPermaLink="true">${esc(url)}</guid>`,
        date ? el("pubDate", new Date(date).toUTCString()) : "",
        ...a.authors.map((x) => el("dc:creator", x.name)),
        el("category", ARTICLE_TYPE_LABEL[a.type]),
        el(
          "description",
          `${a.issue ? issueLabel(a.issue) : "Article in Press"}. ${joinNames(a.authors.map((x) => x.name))}. ${a.abstract}`,
        ),
        "</item>",
      ].join("");
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
${el("title", s.journalName)}
${el("link", siteUrl)}
${el("description", s.seo.description)}
<language>en</language>
<atom:link href="${esc(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=3600",
    },
  });
}
