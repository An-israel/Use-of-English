"use client";

import { useSyncExternalStore } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60) };
}

// Ticks every 30 s; the snapshot is rounded so React sees a stable value between ticks.
function subscribe(cb: () => void) {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
}
const minuteNow = () => Math.floor(Date.now() / 30_000) * 30_000;

/** Live countdown to a deadline. Renders nothing until mounted, so server and client markup match. */
export function Countdown({ deadline }: { deadline: string }) {
  const now = useSyncExternalStore(subscribe, minuteNow, () => null);
  if (now === null) return <div className="h-[5.5rem]" aria-hidden="true" />;
  const left = new Date(deadline).getTime() - now;
  if (left <= 0) return <p className="font-display text-[1.6rem]">The deadline has passed.</p>;
  const { days, hours, minutes } = parts(left);
  const unit = (n: number, label: string) => (
    <div className="min-w-[4.5rem]">
      <span className="tabular font-display block text-[clamp(2.6rem,2rem+2.4vw,4rem)] leading-none">
        {String(n).padStart(2, "0")}
      </span>
      <span className="smallcaps mt-2 block text-[0.8rem] opacity-75">{label}</span>
    </div>
  );
  return (
    <div
      className="flex gap-6 sm:gap-10"
      role="timer"
      aria-label={`${days} days, ${hours} hours and ${minutes} minutes left`}
    >
      {unit(days, days === 1 ? "day" : "days")}
      {unit(hours, "hours")}
      {unit(minutes, "minutes")}
    </div>
  );
}
