import Link from "next/link";
import { SiteChrome } from "@/components/site/SiteChrome";
import { Weave } from "@/components/weave/Weave";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <SiteChrome>
      <section className="relative isolate overflow-hidden">
        <Weave
          density="loose"
          colours={["var(--thread)"]}
          opacity={0.12}
          fade="left"
          className="absolute inset-0 -z-10 h-full w-full"
          seed={404}
        />
        <div className="max-w-page mx-auto grid grid-cols-12 gap-6 px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
          <div className="col-span-12 md:col-span-7">
            <p className="smallcaps text-muted text-[0.85rem]">Error 404</p>
            <h1 className="display-tight font-display mt-5 text-[clamp(2.5rem,1.8rem+3.5vw,4.5rem)]">
              A loose thread.
            </h1>
            <p className="font-reading text-muted mt-6 max-w-[32rem] text-[1.2rem] leading-relaxed">
              The page you were looking for isn’t woven into the journal. It may have moved, or the link may be
              mistyped.
            </p>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[1rem]">
              <li>
                <Link href="/" className="text-brand decoration-thread underline underline-offset-4">
                  Return home
                </Link>
              </li>
              <li>
                <Link href="/issues" className="text-brand decoration-thread underline underline-offset-4">
                  Browse all issues
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-brand decoration-thread underline underline-offset-4">
                  Search the journal
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
