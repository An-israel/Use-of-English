"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PdfReader = dynamic(() => import("./PdfReader"), {
  ssr: false,
  loading: () => <p className="text-muted p-6">Loading the reader…</p>,
});

/** Loads pdf.js only when the reader is about to be seen, so the article page stays light. */
export function PdfReaderLazy(props: { url: string; title: string; downloadHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="min-h-[24rem]">
      {near ? <PdfReader {...props} /> : null}
    </div>
  );
}
