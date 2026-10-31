import Link from "next/link";
import { Emblem } from "@/components/brand/Emblem";
import type { ReactNode } from "react";
import { Weave } from "@/components/weave/Weave";

/** Split layout for sign-in pages: a woven panel beside a calm form column. */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="max-w-page mx-auto grid grid-cols-12 lg:min-h-[calc(100dvh-6rem)]">
      {/* No negative z-index here: Chrome can paint an animated negative-z layer under a
          parent's own background, which hid the weave on this solid panel. */}
      <div className="bg-forest relative col-span-12 hidden overflow-hidden text-[#FAF7EE] lg:col-span-5 lg:flex lg:flex-col lg:justify-end">
        <Weave
          animate
          density="regular"
          colours={["#E1B521", "#E9E2C8"]}
          lozenges={0.06}
          opacity={0.28}
          width={700}
          height={900}
          className="absolute inset-0 h-full w-full"
          seed={91}
        />
        <div className="relative p-12">
          {aside ?? (
            <>
              <Emblem title="" className="mb-8 size-28 drop-shadow-lg" />
              <p className="font-display text-[1.6rem] leading-snug">
                “A platform for original research across the humanities, and for ideas that cross borders.”
              </p>
              <p className="smallcaps mt-4 text-[0.82rem] text-[#FAF7EE]/70">
                Journal of Humanities and Transcultural Studies
              </p>
            </>
          )}
        </div>
      </div>
      <div className="col-span-12 flex items-start px-4 py-14 sm:px-6 lg:col-span-6 lg:col-start-7 lg:items-center lg:px-0 lg:py-20">
        <div className="w-full max-w-[28rem]">
          <p className="smallcaps text-muted text-[0.85rem]">{eyebrow}</p>
          <h1 className="font-display mt-3 text-[clamp(2rem,1.6rem+1.6vw,2.8rem)] leading-[1.08]">{title}</h1>
          {intro && <div className="text-muted mt-4">{intro}</div>}
          <div className="mt-10">{children}</div>
          <p className="border-rule text-muted mt-12 border-t pt-6 text-[0.85rem]">
            We use one essential cookie to keep you signed in. See our{" "}
            <Link href="/policies/privacy" className="decoration-rule hover:text-fg underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
