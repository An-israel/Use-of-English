import type { Metadata } from "next";
import { PageHeader } from "@/components/journal/PageHeader";
import { getPage, getSettings } from "@/lib/data";
import { publicEnv } from "@/lib/env";
import { sanitize } from "@/lib/sanitize";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to the JHTS editorial office.",
  alternates: { canonical: "/contact" },
};

const clean = (s: string) => s.replace(/\s*\[TO CONFIRM\]/g, "");
const pending = (s: string) => s.includes("[TO CONFIRM]");

export default async function ContactPage() {
  const [page, s] = await Promise.all([getPage("page", "contact"), getSettings()]);
  const emailPlaceholder = s.contactEmail.startsWith("[");
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        eyebrow="Get in touch"
        title="Contact the editorial office"
        seed={67}
      />
      <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-14 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="col-span-12 lg:col-span-7">
          {page && (
            <div className="prose-jhts reading mb-10" dangerouslySetInnerHTML={{ __html: sanitize(page.bodyHtml) }} />
          )}
          <ContactForm turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </div>
        <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-24">
            <dl className="space-y-8">
              {!emailPlaceholder && (
                <div>
                  <dt className="smallcaps text-muted text-[0.78rem]">Email</dt>
                  <dd className="font-display mt-2 text-[1.2rem]">
                    <a href={`mailto:${s.contactEmail}`} className="decoration-thread underline underline-offset-4">
                      {s.contactEmail}
                    </a>
                  </dd>
                </div>
              )}
              {s.enquiries.length > 0 && (
                <div>
                  <dt className="smallcaps text-muted text-[0.78rem]">For enquiries</dt>
                  <dd className="mt-3">
                    <ul className="divide-rule border-rule divide-y border-y">
                      {s.enquiries.map((e) => (
                        <li key={e.phone} className="py-3">
                          <span className="block leading-snug">{e.name}</span>
                          <span className="text-muted block text-[0.88rem]">{e.role}</span>
                          <a
                            href={`tel:${e.phone.replace(/\(0\)|[^+\d]/g, "")}`}
                            className="tabular decoration-thread mt-1 inline-block underline underline-offset-4"
                          >
                            {e.phone}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              <div>
                <dt className="smallcaps text-muted text-[0.78rem]">Post</dt>
                <dd className="mt-2 leading-relaxed">
                  <address className="not-italic">{clean(s.postalAddress)}</address>
                  {pending(s.postalAddress) && <mark className="to-confirm-inline">[TO CONFIRM]</mark>}
                </dd>
              </div>
              <div>
                <dt className="smallcaps text-muted text-[0.78rem]">Office hours</dt>
                <dd className="mt-2">
                  {clean(s.officeHours)}{" "}
                  {pending(s.officeHours) && <mark className="to-confirm-inline">[TO CONFIRM]</mark>}
                </dd>
              </div>
            </dl>
            <p className="border-rule text-muted mt-8 border-t pt-6 text-[0.9rem]">
              Questions about a submission? Include your submission ID (for example JHTS-2027-0042) so we can find it
              quickly.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
