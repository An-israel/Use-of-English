import { Skeleton } from "@/components/journal/Skeleton";

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="px-5 py-8 lg:px-10">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-4 w-[28rem] max-w-full" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
