/**
 * Clean-up for HTML pasted from Microsoft Word or Google Docs before the
 * editor parses it. The editor's schema and the server-side sanitiser then
 * drop anything that is still not allowed; this step removes the noise that
 * would otherwise survive as stray spans, empty paragraphs and odd spacing.
 */
export function cleanPastedHtml(html: string): string {
  return (
    html
      // Word's conditional comments and XML islands
      .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<\/?(?:o|w|m|v):[^>]*>/gi, "")
      .replace(/<(style|script|meta|link|title|xml)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(?:meta|link)[^>]*\/?>/gi, "")
      // presentational attributes: classes (MsoNormal…), inline styles, language tags
      .replace(/\s(?:class|style|lang|align|face|size|color)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // Google Docs wraps everything in <b id="docs-internal-guid-…">
      .replace(/<b\s+id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, "$1")
      // unwrap <font> and attribute-less <span>
      .replace(/<\/?font[^>]*>/gi, "")
      .replace(/<span>([\s\S]*?)<\/span>/gi, "$1")
      // non-breaking spaces Word uses for indentation, and empty paragraphs
      .replace(/(&nbsp;| ){2,}/g, " ")
      .replace(/<p>(?:\s|&nbsp;| |<br\s*\/?>)*<\/p>/gi, "")
  );
}
