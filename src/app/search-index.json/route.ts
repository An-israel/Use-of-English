import { paletteIndex } from "@/lib/palette-index";

/** The search palette's index (see lib/palette-index.ts); cached with the content it lists. */
export async function GET() {
  return Response.json(await paletteIndex(), {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
