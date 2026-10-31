import Link from "next/link";
import { Fragment } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { HANDBOOK, HANDBOOK_INTRO, type HandbookBlock } from "@/content/handbook";
import { requireRole } from "@/lib/auth";
import { inlineTokens } from "@/lib/handbook";
import { STAFF_ROLES } from "@/lib/workflow";

export const metadata = { title: "Handbook" };

function Inline({ text }: { text: string }) {
  return inlineTokens(text).map((t, i) =>
    t.kind === "bold" ? (
      <strong key={i} className="font-medium">
        {t.text}
      </strong>
    ) : t.kind === "link" ? (
      <Link key={i} href={t.href} className="text-brand decoration-thread underline underline-offset-4">
        {t.text}
      </Link>
    ) : (
      <Fragment key={i}>{t.text}</Fragment>
    ),
  );
}

function Block({ b }: { b: HandbookBlock }) {
  if ("p" in b)
    return (
      <p>
        <Inline text={b.p} />
      </p>
    );
  if ("tip" in b)
    return (
      <p className="border-thread border-l-2 bg-[color-mix(in_oklab,var(--thread)_8%,transparent)] px-4 py-3">
        <Inline text={b.tip} />
      </p>
    );
  if ("steps" in b)
    return (
      <ol className="space-y-3">
        {b.steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[1.75rem_1fr] gap-2">
            <span aria-hidden="true" className="font-display tabular text-thread-text text-[1.05rem] leading-[1.6]">
              {i + 1}
            </span>
            <span>
              <Inline text={s} />
            </span>
          </li>
        ))}
      </ol>
    );
  return (
    <ul className="space-y-2">
      {b.list.map((s, i) => (
        <li key={i} className="grid grid-cols-[1rem_1fr] gap-2">
          <span aria-hidden="true" className="bg-thread mt-[0.6rem] block size-1.5 rotate-45" />
          <span>
            <Inline text={s} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The Editor's Handbook (brief section 15), for every staff role. Source: src/content/handbook.ts. */
export default async function HandbookPage() {
  await requireRole(STAFF_ROLES, "/admin/handbook");
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Editor’s Handbook"
        description={HANDBOOK_INTRO}
      />
      <div className="grid grid-cols-1 gap-y-8 px-5 py-8 lg:grid-cols-12 lg:gap-x-10 lg:px-10">
        <nav aria-label="Handbook contents" className="lg:col-span-3">
          <ol className="text-muted space-y-1.5 text-[0.9rem] lg:sticky lg:top-8">
            {HANDBOOK.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-fg">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-[44rem] min-w-0 space-y-12 lg:col-span-9">
          {HANDBOOK.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-8">
              <h2 id={`${s.id}-h`} className="font-display text-[1.45rem] leading-tight">
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 text-[0.98rem] leading-[1.65]">
                {s.blocks.map((b, i) => (
                  <Block key={i} b={b} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
