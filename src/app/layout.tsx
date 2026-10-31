import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { themeScript } from "@/components/site/ThemeToggle";
import { siteUrl } from "@/lib/env";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Self-hosted at build time by next/font (no requests to Google from browsers).
// The flyer's faces: Playfair Display for headings, Source Sans 3 for text. Only
// the Latin files are preloaded; other subsets download when a page needs them.
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  style: ["normal", "italic"],
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
    { media: "(prefers-color-scheme: light)", color: "#FAF7EE" },
    { media: "(prefers-color-scheme: dark)", color: "#101511" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${playfair.variable} ${sourceSans.variable}`}
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
