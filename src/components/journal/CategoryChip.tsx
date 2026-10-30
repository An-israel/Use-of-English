import Link from "next/link";
import clsx from "clsx";
import type { Category } from "@/lib/types";

/** A subject chip in its thread colour: a small lozenge and the subject name. */
export function CategoryChip({
  category,
  link = true,
  size = "sm",
  className,
}: {
  category: Pick<Category, "name" | "slug" | "threadColor">;
  link?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const colour = `var(${category.threadColor})`;
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="inline-block size-[0.42rem] shrink-0 rotate-45"
        style={{ backgroundColor: colour }}
      />
      <span>{category.name}</span>
    </>
  );
  const cls = clsx(
    "inline-flex max-w-full items-center gap-2 rounded-[2px] border font-sans leading-none transition-colors",
    size === "sm" ? "px-2 py-[0.3rem] text-[0.78rem]" : "px-3 py-2 text-[0.88rem]",
    className,
  );
  const style = {
    color: colour,
    borderColor: `color-mix(in oklab, ${colour} 35%, transparent)`,
    backgroundColor: `color-mix(in oklab, ${colour} 6%, transparent)`,
  };
  if (!link)
    return (
      <span className={cls} style={style}>
        {inner}
      </span>
    );
  return (
    <Link
      href={`/subjects/${category.slug}`}
      className={clsx(cls, "hover:bg-[color-mix(in_oklab,currentColor_12%,transparent)]")}
      style={style}
    >
      {inner}
    </Link>
  );
}
