import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/journal/Breadcrumbs";
import { Monogram } from "@/components/journal/Monogram";
import { Reveal } from "@/components/journal/Reveal";
import { OrcidIcon } from "@/components/ui/icons";
import { Weave } from "@/components/weave/Weave";
import { getBoard, getSettings } from "@/lib/data";
import { BOARD_GROUP_LABEL, type BoardGroup, type BoardMember } from "@/lib/types";

export const metadata: Metadata = {
  title: "Editorial Board",
  description: "The Editor-in-Chief, editors and consultants of the Journal of Humanities and Transcultural Studies.",
  alternates: { canonical: "/editorial-board" },
};

const GROUP_NOTES: Partial<Record<BoardGroup, string>> = {
  assistant_editors: "Handle submissions through screening, review and decision.",
  associate_editors: "Advise on scope and review in their fields, in Nigeria and abroad.",
  book_review_editors: "Commission and edit the journal’s book reviews.",
  managing_editors: "Run the editorial office, production and the publication schedule.",
};

const year = (d: string | null) => (d ? d.slice(0, 4) : "");

function Term({ m, show }: { m: BoardMember; show: boolean }) {
  if (!show || !m.termStart || !m.termEnd) return null;
  return (
    <p className="tabular text-muted mt-1 text-[0.8rem]">
      Term: {year(m.termStart)} to {year(m.termEnd)}
    </p>
  );
}

function Links({ m }: { m: BoardMember }) {
  if (!m.orcid && !m.profileUrl) return null;
  return (
    <p className="mt-2 flex items-center gap-3 text-[0.82rem]">
      {m.orcid && (
        <a
          href={`https://orcid.org/${m.orcid}`}
          className="text-muted hover:text-fg inline-flex items-center gap-1.5"
          aria-label={`ORCID iD for ${m.name}`}
        >
          <OrcidIcon width={14} height={14} /> ORCID
        </a>
      )}
      {m.profileUrl && (
        <a
          href={m.profileUrl}
          className="text-muted decoration-rule hover:text-fg underline underline-offset-4"
          rel="noopener noreferrer"
        >
          Profile
        </a>
      )}
    </p>
  );
}

export default async function EditorialBoardPage() {
  const [board, settings] = await Promise.all([getBoard(), getSettings()]);
  const show = settings.showBoardTerms;
  const eic = board.filter((m) => m.group === "editor_in_chief");
  const groups = (
    ["assistant_editors", "associate_editors", "book_review_editors", "managing_editors"] as BoardGroup[]
  ).map((g) => ({
    group: g,
    members: board.filter((m) => m.group === g),
  }));
  const consultants = board.filter((m) => m.group === "journal_consultants");

  return (
    <>
      <header className="border-rule relative isolate overflow-hidden border-b">
        <Weave density="loose" opacity={0.1} fade="left" className="absolute inset-0 -z-10 h-full w-full" seed={77} />
        <div className="max-w-page mx-auto px-4 pt-8 sm:px-6 lg:px-10">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: "Editorial Board" }]}
          />
        </div>
        <div className="max-w-page mx-auto px-4 pt-12 pb-16 sm:px-6 lg:px-10 lg:pt-16 lg:pb-24">
          <p className="smallcaps text-muted text-[0.85rem]">About the journal</p>
          <h1 className="display-tight font-display mt-4 text-[clamp(2.6rem,1.8rem+3.4vw,4.8rem)]">Editorial Board</h1>
          <p className="font-reading text-muted mt-6 max-w-[38rem] text-[1.15rem] leading-relaxed">
            JHTS is edited by scholars of the University of Nigeria, Nsukka, with associate editors and consultants in
            Nigeria, Cameroon, Malaysia and the United Kingdom. Members serve five-year terms and may be reappointed.
          </p>
        </div>
      </header>

      {eic.map((m) => (
        <section key={m.id} aria-labelledby="eic-title" className="border-rule bg-surface border-b">
          <div className="max-w-page mx-auto grid grid-cols-12 items-center gap-x-6 gap-y-8 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="col-span-5 sm:col-span-3 lg:col-span-3">
              <Monogram name={m.name} photoUrl={m.photoUrl} className="w-full max-w-[14rem]" />
            </div>
            <div className="col-span-12 sm:col-span-9 lg:col-span-8 lg:col-start-5">
              <h2
                id="eic-title"
                className="smallcaps text-thread-text font-sans text-[0.85rem] font-normal tracking-[0.08em]"
              >
                {BOARD_GROUP_LABEL.editor_in_chief}
              </h2>
              <p className="font-display mt-3 text-[clamp(2rem,1.6rem+1.6vw,3rem)] leading-tight">{m.name}</p>
              {m.title && <p className="text-muted mt-2">{m.title}</p>}
              <p className="text-muted mt-2 text-[1.05rem]">{m.affiliation}</p>
              <Term m={m} show={show} />
              <Links m={m} />
              <p className="text-muted mt-6 max-w-[36rem] text-[0.95rem] leading-relaxed">
                The Editor-in-Chief makes final editorial decisions and serves a five-year term, separate from the
                office of the Coordinator of the Use of English Unit.
              </p>
            </div>
          </div>
        </section>
      ))}

      <div className="max-w-page mx-auto px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        {groups.map(({ group, members }) => (
          <section
            key={group}
            aria-labelledby={`g-${group}`}
            className="border-rule grid grid-cols-12 gap-x-6 gap-y-6 border-t py-12 first:border-t-0 first:pt-0"
          >
            <div className="col-span-12 lg:col-span-3">
              <h2 id={`g-${group}`} className="font-display text-[1.6rem] leading-tight">
                {BOARD_GROUP_LABEL[group]}
              </h2>
              {GROUP_NOTES[group] && (
                <p className="text-muted mt-2 max-w-[18rem] text-[0.9rem]">{GROUP_NOTES[group]}</p>
              )}
            </div>
            <ul className="col-span-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:col-span-9 xl:grid-cols-3">
              {members.map((m, i) => (
                <Reveal as="li" index={i} key={m.id} className="flex gap-4">
                  {m.photoUrl ? (
                    <Monogram name={m.name} photoUrl={m.photoUrl} className="w-14 shrink-0" />
                  ) : (
                    <span aria-hidden="true" className="bg-thread mt-2 inline-block size-2 shrink-0 rotate-45" />
                  )}
                  <div>
                    <p className="font-display text-[1.2rem] leading-snug">{m.name}</p>
                    {m.title && <p className="text-muted text-[0.88rem]">{m.title}</p>}
                    <p className="text-muted mt-1 text-[0.9rem]">{m.affiliation}</p>
                    <Term m={m} show={show} />
                    <Links m={m} />
                  </div>
                </Reveal>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {consultants.length > 0 && (
        <section
          aria-labelledby="consultants-title"
          className="bg-inverse text-inverse-fg relative isolate overflow-hidden"
        >
          <Weave
            density="regular"
            colours={["var(--jhts-ochre)"]}
            opacity={0.14}
            fade="right"
            className="absolute inset-0 -z-10 h-full w-full"
            seed={31}
          />
          <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-10 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            <div className="col-span-12 lg:col-span-3">
              <h2 id="consultants-title" className="font-display text-[1.8rem] leading-tight">
                {BOARD_GROUP_LABEL.journal_consultants}
              </h2>
              <p className="text-inverse-muted mt-2 max-w-[18rem] text-[0.9rem]">
                Senior scholars who advise the board on the journal’s direction and standards.
              </p>
            </div>
            <ul className="col-span-12 grid gap-x-8 gap-y-10 sm:grid-cols-3 lg:col-span-9">
              {consultants.map((m, i) => (
                <Reveal as="li" index={i} key={m.id} className="border-t border-white/15 pt-5">
                  <p className="font-display text-[1.3rem] leading-snug">{m.name}</p>
                  <p className="text-inverse-muted mt-1 text-[0.9rem]">{m.affiliation}</p>
                  {show && m.termStart && m.termEnd && (
                    <p className="tabular text-inverse-muted mt-1 text-[0.8rem]">
                      Term: {year(m.termStart)} to {year(m.termEnd)}
                    </p>
                  )}
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
