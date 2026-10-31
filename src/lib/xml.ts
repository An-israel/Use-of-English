/** Minimal, safe XML writing for RSS, Crossref and OAI-PMH. */

/** Escape text and attribute values, and drop characters XML 1.0 forbids. */
export function esc(v: string | number | null | undefined): string {
  return String(v ?? "")
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** <tag>text</tag>, or nothing when the value is empty. */
export function el(tag: string, value: string | number | null | undefined, attrs = ""): string {
  if (value == null || value === "") return "";
  return `<${tag}${attrs ? ` ${attrs}` : ""}>${esc(value)}</${tag}>`;
}

/** Strip tags from rich text for plain-text fields (abstracts, descriptions). */
export function plain(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<\/?(p|br|li|ul|ol|h[1-6]|div|blockquote|tr|td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
