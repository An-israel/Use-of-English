import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

/**
 * Gentle reveal on scroll; `index` staggers siblings. Pure CSS (a scroll-driven
 * animation, see `.reveal` in globals.css): no JavaScript, so content is never
 * hidden waiting for hydration, and anything already on screen shows at once.
 * Browsers without scroll timelines, and readers who prefer reduced motion,
 * simply see the content.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  return (
    <Tag className={clsx("reveal", className)} style={{ "--reveal-i": Math.min(index, 8) } as CSSProperties}>
      {children}
    </Tag>
  );
}
