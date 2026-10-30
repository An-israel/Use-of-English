import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { issueLabelShort } from "@/lib/issues";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { StatusPill } from "./StatusPill";

export type ArticleListRow = {
  id: string;
  issue_id: string | null;
  title: string;
  slug: string;
  type: ArticleType;
  status: string;
  online_at: string | null;
  updated_at: string;
  deleted_at: string | null;
  is_sample: boolean;
  issue: { number: number; volume: { number: number; year: number } } | null;
  authors: { name: string; position: number }[];
};

export const ARTICLE_LIST_SELECT =
  "id, issue_id, title, slug, type, status, online_at, updated_at, deleted_at, is_sample, issue:issues ( number, volume:volumes ( number, year ) ), authors:article_authors ( name, position )";

/** Shared table for articles, Articles in Press and book reviews. */
export function ArticleTable({ rows, extra }: { rows: ArticleListRow[]; extra?: (r: ArticleListRow) => ReactNode }) {
  return (
    <div className="border-rule bg-surface overflow-x-auto rounded-[3px] border">
      <table className="admin-table min-w-[52rem]">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Issue</th>
            <th scope="col">Status</th>
            <th scope="col">Updated</th>
            {extra && <th scope="col">Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link href={`/admin/articles/${r.id}`} className="font-medium hover:underline hover:underline-offset-4">
                  {r.title}
                </Link>
                {r.is_sample && <span className="text-accent ml-2 text-[0.72rem]">SAMPLE</span>}
                <span className="text-muted block text-[0.8rem]">
                  {ARTICLE_TYPE_LABEL[r.type]}
                  {r.authors.length
                    ? ` · ${r.authors
                        .sort((a, b) => a.position - b.position)
                        .map((a) => a.name)
                        .join(", ")}`
                    : ""}
                </span>
              </td>
              <td className="text-muted whitespace-nowrap">
                {r.issue
                  ? issueLabelShort({
                      volume: r.issue.volume.number,
                      number: r.issue.number,
                      year: r.issue.volume.year,
                    })
                  : "—"}
              </td>
              <td>
                <StatusPill status={r.deleted_at ? "deleted" : r.status} />
              </td>
              <td className="tabular text-muted whitespace-nowrap">{formatDate(r.updated_at)}</td>
              {extra && <td>{extra(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
