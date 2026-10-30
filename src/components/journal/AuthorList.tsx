import { OrcidIcon } from "@/components/ui/icons";
import type { Author } from "@/lib/types";

/** "A. Okafor, T. Eze and G. Adeyemi" for lists and cards. */
export function AuthorNames({ authors, className }: { authors: Author[]; className?: string }) {
  const names = authors.map((a) => a.name);
  const text = names.length <= 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return <span className={className}>{text}</span>;
}

/**
 * Full author block for article pages: names with superscript affiliation
 * numbers, ORCID links and the corresponding author marked, then the
 * numbered affiliations.
 */
export function AuthorBlock({ authors }: { authors: Author[] }) {
  const affiliations: string[] = [];
  for (const a of authors) if (a.affiliation && !affiliations.includes(a.affiliation)) affiliations.push(a.affiliation);
  const showNumbers = affiliations.length > 1;

  return (
    <div>
      <ul className="font-display text-fg flex flex-wrap gap-x-5 gap-y-2 text-[1.2rem]">
        {authors.map((a) => (
          <li key={a.name} className="inline-flex items-baseline gap-1.5">
            <span>{a.name}</span>
            {showNumbers && a.affiliation && (
              <sup className="tabular text-muted font-sans text-[0.7rem]">
                {affiliations.indexOf(a.affiliation) + 1}
              </sup>
            )}
            {a.isCorresponding && (
              <sup className="text-accent font-sans text-[0.75rem]" title="Corresponding author">
                <span aria-hidden="true">*</span>
                <span className="sr-only">(corresponding author)</span>
              </sup>
            )}
            {a.orcid && (
              <a
                href={`https://orcid.org/${a.orcid}`}
                className="relative top-[2px] self-center"
                aria-label={`ORCID iD for ${a.name}`}
                title={`ORCID ${a.orcid}`}
              >
                <OrcidIcon width={15} height={15} />
              </a>
            )}
          </li>
        ))}
      </ul>
      <ol className="text-muted mt-3 space-y-0.5 text-[0.88rem]">
        {affiliations.map((aff, i) => (
          <li key={aff} className="flex gap-2">
            {showNumbers && <span className="tabular w-3 shrink-0 text-right">{i + 1}</span>}
            <span>{aff}</span>
          </li>
        ))}
        {authors.some((a) => a.isCorresponding) && (
          <li className="flex gap-2">
            {showNumbers && <span className="text-accent w-3 shrink-0 text-right">*</span>}
            <span>{showNumbers ? "" : <span className="text-accent">* </span>}Corresponding author</span>
          </li>
        )}
      </ol>
    </div>
  );
}
