import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, Literata } from "next/font/google";
import { themeScript } from "@/components/site/ThemeToggle";
import { siteUrl } from "@/lib/env";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Self-hosted at build time by next/font (no requests to Google from browsers).
// Only the Latin files are preloaded; Latin Extended and the other subsets are
// still declared and download only on pages that use those characters.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  style: ["normal", "italic"],
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JHTS · Journal of Humanities and Transcultural Studies",
    template: "%s · JHTS",
  },
  description:
    "A peer-reviewed, open-access quarterly journal of the humanities and transcultural studies, published by the Use of English Unit, School of General Studies, University of Nigeria, Nsukka.",
  applicationName: "JHTS",
  openGraph: { siteName: "Journal of Humanities and Transcultural Studies", type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E7" },
    { media: "(prefers-color-scheme: dark)", color: "#12110E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${fraunces.variable} ${literata.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {children}
        {/* Vercel Web Analytics and Speed Insights (item 58): cookie-free, only on Vercel. */}
        {process.env.VERCEL === "1" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
