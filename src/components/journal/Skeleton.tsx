import clsx from "clsx";

/** Skeleton block with a faint thread shimmer. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx("skeleton rounded-[2px]", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="max-w-page mx-auto px-4 py-16 sm:px-6 lg:px-10" role="status" aria-label="Loading">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="mt-6 h-12 w-3/4" />
      <Skeleton className="mt-3 h-12 w-1/2" />
      <div className="mt-12 grid gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
