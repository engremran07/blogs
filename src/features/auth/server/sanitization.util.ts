/**
 * ============================================================================
 * MODULE:   features/auth/sanitization.util.ts
 * PURPOSE:  Self-contained input sanitization for the Users module.
 *           No external dependencies (sanitize-html removed).
 *           BUG FIX: Removed 'data' from allowedSchemes (XSS vector).
 * ============================================================================
 */

/**
 * Strip all HTML tags from a string, decode entities, and collapse whitespace.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  let sanitized = text.replace(/<[^>]*>/g, '');
  sanitized = decodeHTMLEntities(sanitized);
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  return sanitized;
}

/**
 * Validate and normalise an email address.
 * Returns lowercase trimmed email or null if invalid.
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Validate a URL — only http/https schemes are allowed.
 * `data:` and `javascript:` are explicitly blocked.
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null;
  const sanitized = url.trim();

  // Block dangerous schemes
  if (/^(javascript|data|vbscript):/i.test(sanitized)) return null;

  // Only allow http(s)
  if (!/^https?:\/\//i.test(sanitized)) return null;

  try {
    new URL(sanitized);
    return sanitized;
  } catch {
    return null;
  }
}

/**
 * Convert a string to a URL-safe slug.
 * Strips non-alphanumeric characters, collapses dashes, and limits length.
 */
export function sanitizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeHTMLEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|nbsp);/g,
    (match) => HTML_ENTITIES[match] || match,
  );
}
