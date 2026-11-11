import { connection } from "next/server";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";

/**
 * security.txt (RFC 9116, I9): where to report a security problem. The office
 * email once it is set; until then, the contact page.
 */
export async function GET() {
  await connection();
  const s = await getSettings();
  const contact = s.contactEmail.startsWith("[") ? `${siteUrl}/contact` : `mailto:${s.contactEmail}`;
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = [
    `Contact: ${contact}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    `Canonical: ${siteUrl}/.well-known/security.txt`,
    `Policy: ${siteUrl}/policies/privacy`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
