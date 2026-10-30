import type { Metadata } from "next";
import Link from "next/link";
import { BookCover } from "@/components/journal/BookCover";
import { EmptyState } from "@/components/journal/EmptyState";
import { PageHeader } from "@/components/journal/PageHeader";
import { Reveal } from "@/components/journal/Reveal";
import { SampleTag } from "@/components/journal/SampleTag";
import { getBookReviews } from "@/lib/data";
import { issueLabelShort } from "@/lib/issues";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Book Reviews",
  description: "Reviews of new books in the humanities and transcultural studies, published in JHTS.",
  alternates: { canonical: "/book-reviews" },
};

export default async function BookReviewsPage() {
  const reviews = await getBookReviews();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Book Reviews" }]}
        eyebrow="Book reviews"
        title="New books, read closely"
        summary={
          <>
            Critical reviews of recent books across the humanities, commissioned and edited by the journal’s Book Review
            Editors. To propose a review, read the{" "}
            <Link
              href="/author-guidelines#book-reviews"
              className="text-brand decoration-thread underline underline-offset-4"
            >
              book review guidelines
            </Link>
            .
          </>
        }
        seed={19}
      />
      <div className="max-w-page mx-auto px-4 py-12 sm:px-6 lg:px-10 lg:py-20">
        {reviews.length === 0 ? (
          <EmptyState title="No book reviews yet">
            The first reviews will appear here when they are published.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) =>
              r.bookReview ? (
                <Reveal as="li" index={i} key={r.id}>
                  <Link href={`/articles/${r.slug}`} className="group grid grid-cols-[8rem_1fr] gap-6">
                    <BookCover
                      book={r.bookReview}
                      className="ease-weave shadow-[0_18px_30px_-22px_rgb(21_19_15/0.7)] transition-transform duration-300 group-hover:-translate-y-0.5"
                    />
                    <span className="flex flex-col">
                      <span className="font-display group-hover:decoration-thread text-[1.25rem] leading-snug group-hover:underline group-hover:underline-offset-4">
                        {r.bookReview.bookTitle.replace(/\s*\(SAMPLE\)$/, "")}
                      </span>
                      <span className="text-muted mt-1 text-[0.9rem]">{r.bookReview.bookAuthor}</span>
                      <span className="mt-4 text-[0.88rem]">Reviewed by {r.authors.map((a) => a.name).join(", ")}</span>
                      <span className="tabular text-muted mt-1 text-[0.82rem]">
                        {r.issue ? issueLabelShort(r.issue) : `Online ${formatDate(r.onlineAt)}`}
                      </span>
                      {r.isSample && <SampleTag className="mt-3 self-start" />}
                    </span>
                  </Link>
                </Reveal>
              ) : null,
            )}
          </ul>
        )}
      </div>
    </>
  );
}
