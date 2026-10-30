import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";

export function SectionHeading({
  eyebrow,
  title,
  id,
  link,
  children,
  inverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  id: string;
  link?: { href: string; label: string };
  children?: ReactNode;
  inverse?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
      <div className="max-w-[40rem]">
        <p className={`smallcaps text-[0.85rem] ${inverse ? "text-inverse-muted" : "text-muted"}`}>{eyebrow}</p>
        <h2 id={id} className="font-display mt-3 text-[clamp(1.9rem,1.5rem+1.4vw,2.6rem)] leading-[1.08]">
          {title}
        </h2>
        {children && <div className={`mt-3 ${inverse ? "text-inverse-muted" : "text-muted"}`}>{children}</div>}
      </div>
      {link && (
        <Link
          href={link.href}
          className={`group inline-flex items-center gap-2 text-[0.95rem] ${inverse ? "text-inverse-fg" : "text-brand"} hover:underline hover:underline-offset-4`}
        >
          {link.label}
          <ArrowRightIcon width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
