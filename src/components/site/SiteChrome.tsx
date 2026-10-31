import { Suspense, type ReactNode } from "react";
import { HeaderFallback } from "@/components/site/HeaderFallback";
import { CommandPalette } from "@/components/site/CommandPalette";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Toaster } from "@/components/ui/Toaster";

/** Header, footer, skip link and search palette around every public page. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <Toaster>
      <a
        href="#main"
        className="bg-brand text-brand-fg fixed top-3 left-4 z-[70] -translate-y-24 rounded-sm px-4 py-2 transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <CommandPalette />
    </Toaster>
  );
}
