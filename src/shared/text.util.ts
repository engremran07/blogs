/**
 * ============================================================================
 * MODULE  : shared/text.util.ts
 * PURPOSE : Common text processing utilities used across multiple modules
 * PATTERN : Pure functions, zero dependencies, framework-agnostic
 * ============================================================================
 */

/**
 * Strip all HTML tags, scripts, styles and decode common entities.
 * Returns clean plain text suitable for word counting, SEO analysis, etc.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count words in HTML or plain text.
 * Strips HTML first, then splits on whitespace.
 */
export function countWords(text: string): number {
  const clean = stripHtml(text);
  if (!clean) return 0;
  return clean.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Truncate a string to a maximum length, appending "…" if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
