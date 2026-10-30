/** Marks fictional seed content so nobody mistakes it for real scholarship. */
export function SampleTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`smallcaps border-accent/40 text-accent inline-flex items-center rounded-[2px] border px-1.5 py-[0.2rem] text-[0.7rem] leading-none ${className}`}
      title="Sample content for design review; removed before launch"
    >
      Sample
    </span>
  );
}
