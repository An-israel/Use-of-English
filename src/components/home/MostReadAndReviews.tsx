import Link from "next/link";
import { AuthorNames } from "@/components/journal/AuthorList";
import { BookCover } from "@/components/journal/BookCover";
import { Reveal } from "@/components/journal/Reveal";
import { formatCount } from "@/lib/format";
import type { Article, ArticleSummary } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

export function MostReadAndReviews({ mostRead, reviews }: { mostRead: ArticleSummary[]; reviews: Article[] }) {
  // Before the first issue there is nothing to list: leave no empty band.
  if (!mostRead.length && !reviews.length) return null;
  return (
    <section className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-20 px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
      {mostRead.length > 0 && (
        <div className="col-span-12 lg:col-span-5" aria-labelledby="mostread-title">
          <SectionHeading eyebrow="Most read this month" title="What readers are reading" id="mostread-title" />
          <ol className="mt-10">
            {mostRead.map((a, i) => (
              <Reveal
                as="li"
                index={i}
                key={a.id}
                className="border-rule grid grid-cols-[3rem_1fr] gap-x-4 border-t py-5 first:border-t-0"
              >
                <span className="tabular font-display text-thread-text text-[2.2rem] leading-none" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <Link
                    href={`/articles/${a.slug}`}
                    className="rule-thread font-display text-fg text-[1.12rem] leading-snug"
                  >
                    {a.title}
                  </Link>
                  <p className="text-muted mt-1.5 text-[0.86rem]">
                    <AuthorNames authors={a.authors} />
                    <span aria-hidden="true"> · </span>
                    <span className="tabular">{formatCount(a.viewCount)} views</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      )}
      {reviews.length > 0 && (
        <div className="col-span-12 lg:col-span-6 lg:col-start-7" aria-labelledby="reviews-title">
          <SectionHeading
            eyebrow="Book reviews"
            title="New books, read closely"
            id="reviews-title"
            link={{ href: "/book-reviews", label: "All reviews" }}
          />
          <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-5">
            {reviews.map((r, i) =>
              r.bookReview ? (
                <Reveal as="li" index={i} key={r.id}>
                  <Link href={`/articles/${r.slug}`} className="group grid grid-cols-[6.5rem_1fr] gap-5 sm:block">
                    <BookCover
                      book={r.bookReview}
                      className="ease-weave shadow-[0_18px_30px_-22px_rgb(21_19_15/0.7)] transition-transform duration-300 group-hover:-translate-y-0.5"
                    />
                    <span className="block sm:mt-4">
                      <span className="font-display text-fg group-hover:decoration-thread block text-[1.05rem] leading-snug group-hover:underline group-hover:underline-offset-4">
                        {r.bookReview.bookTitle.replace(/\s*\(SAMPLE\)$/, "")}
                      </span>
                      <span className="text-muted mt-1 block text-[0.85rem]">{r.bookReview.bookAuthor}</span>
                      <span className="text-muted mt-2 block text-[0.82rem]">Reviewed by {r.authors[0]?.name}</span>
                    </span>
                  </Link>
                </Reveal>
              ) : null,
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
