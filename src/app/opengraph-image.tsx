import { getSettings } from "@/lib/data";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "Journal of Humanities and Transcultural Studies";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The default social card for every page without its own. */
export default async function Image() {
  const s = await getSettings();
  return ogCard({ kicker: "Open access · Quarterly", title: s.journalName, meta: s.tagline, footer: s.publisherShort });
}
