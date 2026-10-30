import Image from "next/image";
import clsx from "clsx";

const TITLES = /^(assoc\.|prof\.|dr|mr|mrs|ms)\.?$/i;

/** Initials set in a lozenge, used until a board member's photo is uploaded. */
export function Monogram({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <div className={clsx("relative aspect-square overflow-hidden", className)}>
        <Image src={photoUrl} alt={name} fill sizes="160px" className="duotone object-cover" />
      </div>
    );
  }
  const parts = name.split(/\s+/).filter((p) => !TITLES.test(p));
  const initials = `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`;
  return (
    <div aria-hidden="true" className={clsx("relative aspect-square", className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <path d="M50 3 97 50 50 97 3 50Z" fill="var(--brand)" />
        <path d="M50 12 88 50 50 88 12 50Z" fill="none" stroke="var(--thread)" strokeWidth="0.8" />
      </svg>
      <span className="font-display text-brand-fg absolute inset-0 flex items-center justify-center text-[clamp(1.2rem,2.4vw,2.2rem)]">
        {initials}
      </span>
    </div>
  );
}
