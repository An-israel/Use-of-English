"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

// Served from our own origin (scripts/copy-pdf-worker.mjs), matching the installed version.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const OPTIONS = { isEvalSupported: false };
const ZOOMS = [0.75, 1, 1.25, 1.5, 2];
/** A4 portrait, used to reserve space before a page renders. */
const RATIO = 297 / 210;

/**
 * In-page PDF reader (brief sections 5.12 and 9): pages render only as
 * they approach the viewport, with zoom, page jump and full screen. The
 * text layer keeps the PDF selectable and readable by screen readers.
 */
export default function PdfReader({ url, title, downloadHref }: { url: string; title: string; downloadHref: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(720);
  const [current, setCurrent] = useState(1);
  const [visible, setVisible] = useState<Set<number>>(() => new Set([1, 2]));
  const [jump, setJump] = useState("");
  const [full, setFull] = useState(false);
  const [failed, setFailed] = useState(false);

  // Fit the page to the reader's width.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.min(900, e.contentRect.width - 32))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Mount pages as they come within ~600px; separately, track the page actually in view.
  // Observers are created after the pages mount, then told about every page element.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !pages) return;
    const near = new IntersectionObserver(
      (entries) =>
        setVisible((prev) => {
          const next = new Set(prev);
          for (const e of entries) if (e.isIntersecting) next.add(Number((e.target as HTMLElement).dataset.page));
          return next.size === prev.size ? prev : next;
        }),
      { root, rootMargin: "600px 0px" },
    );
    const inView = new Set<number>();
    const seen = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting) inView.add(n);
          else inView.delete(n);
        }
        if (inView.size) setCurrent(Math.min(...inView));
      },
      { root, threshold: 0.4 },
    );
    root.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => {
      near.observe(el);
      seen.observe(el);
    });
    return () => {
      near.disconnect();
      seen.disconnect();
    };
  }, [pages]);

  const goTo = (n: number) => {
    const p = Math.min(Math.max(1, n), pages);
    scroller.current?.querySelector<HTMLElement>(`[data-page="${p}"]`)?.scrollIntoView({ block: "start" });
  };
  const pageWidth = Math.round(width * zoom);
  const btn =
    "border-rule hover:border-fg/40 rounded-[2px] border px-2.5 py-1 text-[0.85rem] disabled:opacity-40 bg-surface";

  if (failed)
    return (
      <p className="text-muted">
        The reader couldn’t open this PDF.{" "}
        <a href={downloadHref} className="underline underline-offset-4">
          Download it instead
        </a>
        .
      </p>
    );

  return (
    <div
      ref={frame}
      className="border-rule bg-bg flex flex-col rounded-[3px] border"
      role="region"
      aria-label={`PDF reader: ${title}`}
    >
      <div className="border-rule bg-surface sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          className={btn}
          onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)])}
          disabled={zoom === ZOOMS[0]}
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="tabular w-12 text-center text-[0.85rem]" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)])}
          disabled={zoom === ZOOMS.at(-1)}
          aria-label="Zoom in"
        >
          +
        </button>
        <form
          className="ml-2 flex items-center gap-1.5 text-[0.85rem]"
          onSubmit={(e) => {
            e.preventDefault();
            if (jump) goTo(Number(jump));
            setJump("");
          }}
        >
          <label htmlFor="pdf-page" className="text-muted">
            Page
          </label>
          <input
            id="pdf-page"
            inputMode="numeric"
            pattern="[0-9]*"
            value={jump}
            placeholder={String(current)}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
            className="border-rule bg-bg tabular w-12 rounded-[2px] border px-1.5 py-0.5 text-center"
          />
          <span className="text-muted tabular">of {pages || "…"}</span>
        </form>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => (full ? document.exitFullscreen() : frame.current?.requestFullscreen())}
            aria-pressed={full}
          >
            {full ? "Exit full screen" : "Full screen"}
          </button>
          <a href={downloadHref} className={btn}>
            Download
          </a>
        </div>
      </div>
      <div
        ref={scroller}
        className={full ? "flex-1 overflow-auto" : "max-h-[85vh] overflow-auto"}
        tabIndex={0}
        aria-label="PDF pages"
      >
        <Document
          file={url}
          options={OPTIONS}
          onLoadSuccess={({ numPages }) => setPages(numPages)}
          onLoadError={() => setFailed(true)}
          loading={<p className="text-muted p-6">Opening the PDF…</p>}
          className="flex flex-col items-center gap-4 p-4"
        >
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              data-page={n}
              className="bg-paper shadow-[0_8px_24px_-16px_rgb(21_19_15/0.5)]"
              style={{ width: pageWidth, minHeight: visible.has(n) ? undefined : Math.round(pageWidth * RATIO) }}
            >
              {visible.has(n) && (
                <Page
                  pageNumber={n}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  loading={<div style={{ height: Math.round(pageWidth * RATIO) }} />}
                />
              )}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
