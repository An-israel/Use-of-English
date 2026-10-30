import type { ReactNode } from "react";
import { Weave } from "@/components/weave/Weave";

/** A quiet empty state with a small woven motif. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-rule relative isolate overflow-hidden rounded-[3px] border border-dashed px-6 py-14 text-center">
      <Weave
        density="loose"
        opacity={0.1}
        width={600}
        height={240}
        fade="radial"
        className="absolute inset-0 -z-10 h-full w-full"
        seed={3}
      />
      <p className="font-display text-fg text-[1.5rem]">{title}</p>
      {children && <div className="text-muted mx-auto mt-3 max-w-[30rem]">{children}</div>}
    </div>
  );
}
