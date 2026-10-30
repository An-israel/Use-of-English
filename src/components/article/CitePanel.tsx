"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { bibtex, chicago, citationKey, mla, apa, ris, toPlain, type Citable } from "@/lib/citations";
import { useToast } from "@/components/ui/Toaster";

const TABS = [
  { id: "apa", label: "APA 7th" },
  { id: "mla", label: "MLA 9th" },
  { id: "chicago", label: "Chicago" },
  { id: "bibtex", label: "BibTeX" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Citation formats with one-click copy, plus .ris and .bib downloads. */
export function CitePanel({ citable }: { citable: Citable }) {
  const [tab, setTab] = useState<Tab>("apa");
  const uid = useId();
  const toast = useToast();
  const html =
    tab === "apa" ? apa(citable) : tab === "mla" ? mla(citable) : tab === "chicago" ? chicago(citable) : null;
  const plain = html ? toPlain(html) : bibtex(citable);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      toast(`${TABS.find((t) => t.id === tab)!.label} citation copied`);
    } catch {
      toast("Copying is blocked in this browser. Select the text instead.", "error");
    }
  };

  return (
    <div className="border-rule bg-surface rounded-[3px] border">
      <div role="tablist" aria-label="Citation style" className="border-rule flex overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`${uid}-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${uid}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              const i = TABS.findIndex((x) => x.id === tab);
              if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
              if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
            }}
            className={clsx(
              "-mb-px border-b-2 px-4 py-3 text-[0.88rem] whitespace-nowrap transition-colors",
              tab === t.id ? "border-thread text-fg" : "text-muted hover:text-fg border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${tab}`} className="p-5">
        {html ? (
          <p
            className="font-reading text-fg text-[0.98rem] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="text-fg overflow-x-auto font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap">
            {plain}
          </pre>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-4 py-2 text-[0.88rem] font-medium"
          >
            Copy citation
          </button>
          <button
            type="button"
            onClick={() => download(`${citationKey(citable)}.ris`, ris(citable), "application/x-research-info-systems")}
            className="border-rule hover:border-fg rounded-sm border px-3 py-2 text-[0.85rem]"
          >
            Download .ris
          </button>
          <button
            type="button"
            onClick={() => download(`${citationKey(citable)}.bib`, bibtex(citable), "application/x-bibtex")}
            className="border-rule hover:border-fg rounded-sm border px-3 py-2 text-[0.85rem]"
          >
            Download .bib
          </button>
        </div>
      </div>
    </div>
  );
}
