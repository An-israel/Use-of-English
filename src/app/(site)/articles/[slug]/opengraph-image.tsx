import { getArticle } from "@/lib/data";
import { joinNames } from "@/lib/format";
import { issueLabelShort } from "@/lib/issues";
import { OG_SIZE, ogCard } from "@/lib/og";
import { ARTICLE_TYPE_LABEL } from "@/lib/types";

export const alt = "Article in the Journal of Humanities and Transcultural Studies";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return ogCard({ kicker: "JHTS", title: "Journal of Humanities and Transcultural Studies" });
  const names = a.authors.map((x) => x.name);
  return ogCard({
    kicker: `${ARTICLE_TYPE_LABEL[a.type]} · ${a.issue ? issueLabelShort(a.issue) : "Article in Press"}`,
    title: a.title,
    meta: names.length > 3 ? `${names[0]} and ${names.length - 1} others` : joinNames(names),
  });
}
