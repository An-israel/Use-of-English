import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { IssueCover } from "@/components/weave/IssueCover";
import { getCallForPapers, getFlags, getIssues, getSettings } from "@/lib/data";
import { issueLabelShort, issuePath } from "@/lib/issues";

// Milestone 1: hero and generated covers. The full home page (section 5.2)
// is built at the design checkpoint.
export default async function HomePage() {
  const [settings, flags, cfp, issues] = await Promise.all([
    getSettings(),
    getFlags(),
    getCallForPapers(),
    getIssues(),
  ]);

  return (
    <>
      <Hero settings={settings} cfp={cfp} current={issues[0] ?? null} submissionsOpen={flags.submissions_open} />
      <section className="max-w-page mx-auto px-4 py-20 sm:px-6 lg:px-10 lg:py-28" aria-labelledby="covers-title">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4">
            <p className="smallcaps text-muted text-[0.85rem]">The archive</p>
            <h2 id="covers-title" className="font-display mt-3 text-[2.4rem] leading-[1.05]">
              Every issue, its own weave
            </h2>
            <p className="text-muted mt-4 max-w-[22rem]">
              Each cover is generated from its volume and issue number and coloured by its season. These are SAMPLE
              issues.
            </p>
          </div>
          <ul className="col-span-12 grid grid-cols-2 gap-5 sm:grid-cols-3 md:col-span-8 lg:grid-cols-5">
            {issues.map((i) => (
              <li key={i.id}>
                <Link href={issuePath(i)} className="group block">
                  <IssueCover
                    volume={i.volume}
                    issue={i.number}
                    month={i.month}
                    year={i.year}
                    coverUrl={i.coverUrl}
                    className="shadow-[0_18px_30px_-22px_rgb(21_19_15/0.7)] transition-transform duration-300 group-hover:-translate-y-0.5"
                  />
                  <span className="tabular text-muted group-hover:text-fg mt-3 block text-[0.9rem]">
                    {issueLabelShort(i)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
