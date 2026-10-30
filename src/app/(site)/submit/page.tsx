import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { requireViewer } from "@/lib/auth";
import { getFlags } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { createDraft, discardDraft } from "./actions";

export const metadata: Metadata = { title: "Submit a manuscript", robots: { index: false } };

export default function SubmitPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Authors" }, { label: "Submit a manuscript" }]}
        eyebrow="For authors"
        title="Submit a manuscript"
        summary="Five short steps: details, authors, files, declarations, then review and submit. Your draft is saved as you go, so you can stop and come back."
        seed={71}
      />
      <Suspense fallback={<PageSkeleton />}>
        <Start searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Start({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/submit");
  const flags = await getFlags();
  if (!flags.submissions_open) {
    return (
      <div className="max-w-page mx-auto px-4 py-16 sm:px-6 lg:px-10">
        <p className="text-muted max-w-[36rem]">
          Submissions are closed at the moment. Please see the Call for Papers for the next opening.
        </p>
      </div>
    );
  }
  if (viewer.role === "finance_officer") {
    return (
      <div className="max-w-page mx-auto px-4 py-16 sm:px-6 lg:px-10">
        <p className="text-muted">Finance Officer accounts cannot submit manuscripts.</p>
      </div>
    );
  }
  const { data: drafts } = await (
    await userClient()
  )
    .from("submissions")
    .select("id, title, updated_at")
    .eq("author_id", viewer.id)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-12 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <div className="col-span-12 lg:col-span-7">
        {(sp.error || sp.limited) && (
          <p role="alert" className="border-accent/40 bg-accent/5 text-accent mb-6 rounded-sm border px-4 py-3">
            {sp.limited
              ? "You have started several submissions recently. Please try again later."
              : "We couldn’t start a submission. Please try again."}
          </p>
        )}
        {drafts && drafts.length > 0 && (
          <section aria-labelledby="drafts" className="mb-12">
            <h2 id="drafts" className="font-display text-[1.6rem]">
              Continue a draft
            </h2>
            <ul className="divide-rule border-rule mt-4 divide-y border-y">
              {drafts.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <Link
                      href={`/submit/${d.id}`}
                      className="font-display hover:decoration-thread text-[1.2rem] hover:underline hover:underline-offset-4"
                    >
                      {d.title || "Untitled draft"}
                    </Link>
                    <p className="text-muted text-[0.85rem]">Saved {formatDate(d.updated_at)}</p>
                  </div>
                  <form action={discardDraft}>
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="text-muted decoration-rule hover:text-accent text-[0.85rem] underline underline-offset-4"
                    >
                      Delete draft
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
        <form action={createDraft}>
          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
          <button
            type="submit"
            className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3.5 font-medium"
          >
            {drafts?.length ? "Start a new submission" : "Start your submission"}
          </button>
        </form>
      </div>
      <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
        <div className="border-rule bg-surface rounded-[3px] border p-6">
          <p className="smallcaps text-muted text-[0.78rem]">You will need</p>
          <ul className="mt-4 space-y-3 text-[0.92rem]">
            {[
              "Title, abstract (150–250 words) and 3 to 6 keywords",
              "Names, affiliations and emails for all authors",
              "The anonymised manuscript (.docx)",
              "A separate title page (.docx)",
              "A cover letter (optional)",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden="true" className="bg-thread mt-[0.45rem] inline-block size-1.5 shrink-0 rotate-45" />
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/author-guidelines"
            className="text-brand decoration-thread mt-5 inline-block text-[0.92rem] underline underline-offset-4"
          >
            Read the author guidelines
          </Link>
        </div>
      </aside>
    </div>
  );
}
