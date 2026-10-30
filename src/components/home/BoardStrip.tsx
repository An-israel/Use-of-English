import Link from "next/link";
import { Reveal } from "@/components/journal/Reveal";
import { Monogram } from "@/components/journal/Monogram";
import { BOARD_GROUP_LABEL, BOARD_GROUP_ORDER, type BoardMember } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

export function BoardStrip({ board }: { board: BoardMember[] }) {
  const eic = board.find((m) => m.group === "editor_in_chief");
  const groups = BOARD_GROUP_ORDER.filter((g) => g !== "editor_in_chief").map((g) => ({
    group: g,
    members: board.filter((m) => m.group === g),
  }));
  return (
    <section aria-labelledby="board-title" className="border-rule border-t">
      <div className="max-w-page mx-auto px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <SectionHeading
          eyebrow="Editorial board"
          title="The people behind the journal"
          id="board-title"
          link={{ href: "/editorial-board", label: "Full editorial board" }}
        />
        <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-12">
          {eic && (
            <div className="col-span-12 flex items-center gap-6 md:col-span-4 md:flex-col md:items-start">
              <Monogram name={eic.name} photoUrl={eic.photoUrl} className="w-24 md:w-36" />
              <div>
                <p className="smallcaps text-muted text-[0.8rem]">Editor-in-Chief</p>
                <p className="font-display mt-1 text-[1.5rem] leading-snug">{eic.name}</p>
                <p className="text-muted mt-1 text-[0.9rem]">{eic.affiliation}</p>
              </div>
            </div>
          )}
          <div className="col-span-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 md:col-span-8 lg:grid-cols-3">
            {groups.map(({ group, members }, i) => (
              <Reveal key={group} index={i}>
                <h3 className="smallcaps text-muted font-sans text-[0.8rem] font-normal tracking-[0.08em]">
                  {BOARD_GROUP_LABEL[group]}
                </h3>
                <ul className="mt-3 space-y-1.5 text-[0.95rem]">
                  {members.map((m) => (
                    <li key={m.id}>{m.name}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
        <p className="mt-12">
          <Link
            href="/editorial-board"
            className="text-brand decoration-thread text-[0.95rem] underline underline-offset-4"
          >
            Affiliations and terms on the editorial board page
          </Link>
        </p>
      </div>
    </section>
  );
}
