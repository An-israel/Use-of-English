import { getIssue } from "@/lib/data";
import { issueLabel, monthName } from "@/lib/issues";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "An issue of the Journal of Humanities and Transcultural Studies";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ volume: string; issue: string }> }) {
  const p = await params;
  const issue = await getIssue(Number(p.volume), Number(p.issue));
  if (!issue) return ogCard({ kicker: "JHTS", title: "Journal of Humanities and Transcultural Studies" });
  const n = issue.articles.length;
  return ogCard({
    kicker: issueLabel(issue),
    title: issue.title ?? `The ${monthName(issue.month)} ${issue.year} issue`,
    meta: `${n} ${n === 1 ? "article" : "articles"} · open access`,
  });
}
