import { parseWeaveMaskFile, weaveMaskSvg } from "@/lib/weave";

/**
 * One colour layer of a static weave, used as a CSS mask (see <Weave />).
 * The file name fully determines the drawing, so it is cached for a year.
 */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const spec = parseWeaveMaskFile((await params).file);
  if (!spec) return new Response("Not found", { status: 404 });
  return new Response(weaveMaskSvg(spec), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
