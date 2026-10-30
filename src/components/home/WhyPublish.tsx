import { Reveal } from "@/components/journal/Reveal";
import { Weave } from "@/components/weave/Weave";
import { SectionHeading } from "./SectionHeading";

const POINTS = [
  {
    title: "Rigorous double-blind review",
    body: "Every manuscript is screened, checked for similarity and read by independent reviewers who do not know who wrote it.",
  },
  {
    title: "Quarterly online publication",
    body: "Issues appear in March, June, September and December, and accepted work can be published online as soon as it is ready.",
  },
  {
    title: "Open access",
    body: "Everything we publish is free to read, download and share under a Creative Commons licence, with no charge to readers.",
  },
  {
    title: "Transparent fees",
    body: "Two published fees, a clear account of what they cover, and a firm rule: payment never influences an editorial decision.",
  },
];

export function WhyPublish() {
  return (
    <section aria-labelledby="why-title" className="bg-forest relative isolate overflow-hidden text-[#EFE8DA]">
      <Weave
        density="regular"
        colours={["#C8962E"]}
        opacity={0.12}
        fade="right"
        className="absolute inset-y-0 left-0 -z-10 h-full w-full"
        seed={21}
      />
      <div className="max-w-page mx-auto px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
        <div className="grid grid-cols-12 gap-x-6 gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <SectionHeading
              eyebrow="For authors"
              title="Why publish with JHTS"
              id="why-title"
              inverse
              link={{ href: "/author-guidelines", label: "Author guidelines" }}
            />
          </div>
          <ol className="col-span-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {POINTS.map((p, i) => (
              <Reveal as="li" index={i} key={p.title}>
                <span aria-hidden="true" className="tabular font-display text-[0.95rem] text-[#C8962E]">
                  0{i + 1}
                </span>
                <h3 className="font-display mt-3 text-[1.45rem] leading-snug">{p.title}</h3>
                <p className="mt-3 leading-relaxed text-[#EFE8DA]/75">{p.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
