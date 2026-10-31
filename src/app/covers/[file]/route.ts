import { COVER_LATTICE_VERSION, coverLatticeSvg } from "@/lib/weave";

const FILE = new RegExp(`^lattice-v${COVER_LATTICE_VERSION}-(\\d{1,3})-(\\d{1,2})-(\\d{1,2})\\.svg$`);

/**
 * The woven lattice behind a generated issue cover. Deterministic for a given
 * volume, issue and month, so it is cached for a year (the version in the
 * file name changes with the design).
 */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const m = FILE.exec((await params).file);
  const [volume, issue, month] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
  if (!m || volume < 1 || issue < 1 || month < 1 || month > 12) return new Response("Not found", { status: 404 });
  return new Response(coverLatticeSvg(volume, issue, month), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
