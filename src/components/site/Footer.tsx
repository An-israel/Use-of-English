import Link from "next/link";
import { cacheLife } from "next/cache";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { getSettings } from "@/lib/data";
import { NAV } from "@/lib/nav";
import { Weave } from "@/components/weave/Weave";

export async function Footer() {
  "use cache";
  cacheLife("days");
  const settings = await getSettings();
  const year = new Date().getFullYear();
  const email = settings.contactEmail;
  const emailIsPlaceholder = email.startsWith("[");

  return (
    <footer className="bg-inverse text-inverse-fg mt-auto" aria-labelledby="footer-title">
      <div className="relative h-20 overflow-hidden border-b border-white/10 sm:h-24" aria-hidden="true">
        <Weave
          density="dense"
          colours={["var(--jhts-ochre)", "var(--jhts-terracotta)"]}
          opacity={0.55}
          height={120}
          width={1440}
          lozenges={0.06}
          className="absolute inset-0 h-full w-full"
          seed={11}
        />
      </div>

      <div className="max-w-page mx-auto grid grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:grid-cols-12 lg:px-10 lg:py-20">
        <div className="md:col-span-5">
          <h2 id="footer-title" className="font-display text-[2.4rem] leading-none font-semibold tracking-[-0.02em]">
            {settings.shortName}
          </h2>
          <p className="font-display text-inverse-fg mt-3 max-w-[26rem] text-[1.15rem] leading-snug">
            {settings.journalName}
          </p>
          <p className="text-inverse-muted mt-5 max-w-[28rem] text-[0.92rem] leading-relaxed">{settings.publisher}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[0.9rem]">
            <dt className="smallcaps text-inverse-muted">ISSN</dt>
            <dd className="tabular">{settings.issn ?? "In process"}</dd>
            <dt className="smallcaps text-inverse-muted">Email</dt>
            <dd>
              {emailIsPlaceholder ? (
                <span>{email}</span>
              ) : (
                <a
                  href={`mailto:${email}`}
                  className="decoration-ochre/60 hover:decoration-ochre underline underline-offset-4"
                >
                  {email}
                </a>
              )}
            </dd>
            <dt className="smallcaps text-inverse-muted">Published</dt>
            <dd>{settings.frequency.replace("Quarterly: ", "Quarterly · ")}</dd>
          </dl>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
          {NAV.map((g) => (
            <div key={g.id}>
              <h3 className="smallcaps text-inverse-muted font-sans text-[0.82rem] font-normal tracking-[0.08em]">
                {g.label}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="hover:decoration-ochre text-[0.95rem] hover:underline hover:underline-offset-4"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="grid gap-8 border-t border-white/10 pt-10 md:col-span-12 md:grid-cols-12">
          <p className="font-display max-w-[36rem] text-[1.1rem] leading-snug italic md:col-span-7">
            {FEE_INTEGRITY_STATEMENT}
          </p>
          <div className="flex items-start gap-4 md:col-span-5 md:justify-end">
            <a
              href={settings.licence.url}
              rel="license noopener"
              className="group hover:border-ochre inline-flex items-center gap-3 rounded-sm border border-white/20 px-3 py-2 transition-colors"
            >
              <span className="font-display text-[1.05rem] font-semibold tracking-tight">OA</span>
              <span className="text-[0.85rem] leading-tight">
                Open access
                <span className="text-inverse-muted block">{settings.licence.name}</span>
              </span>
            </a>
          </div>
        </div>

        <div className="text-inverse-muted flex flex-col gap-3 text-[0.85rem] md:col-span-12 md:flex-row md:justify-between">
          <p>
            © <span className="tabular">{year}</span> {settings.publisher}.
          </p>
          <p>
            <Link href="/policies/privacy" className="hover:text-inverse-fg">
              Privacy
            </Link>
            <span aria-hidden="true"> · </span>
            No tracking cookies.
          </p>
        </div>
      </div>
    </footer>
  );
}
