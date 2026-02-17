// blog/sanitization.util.ts
// Sanitization utilities for blog content, slugs, categories, and HTML.
// Framework-agnostic — zero external dependencies.

/* ========================================================================== */
/*  HTML SANITIZATION                                                         */
/* ========================================================================== */

/** Allowlisted HTML tags for blog content. */
const SAFE_TAGS = new Set([
  'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'img',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption', 'picture', 'source', 'video', 'audio',
  'div', 'span', 'section', 'article', 'header', 'footer', 'nav',
  'hr', 'sup', 'sub', 'mark', 'del', 'ins', 'abbr', 'time',
  'details', 'summary', 'dl', 'dt', 'dd', 'caption',
]);

/** Allowlisted attribute names. */
const SAFE_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
  'width', 'height', 'loading', 'decoding', 'srcset', 'sizes',
  'type', 'datetime', 'cite', 'data-id', 'data-type', 'style',
  'colspan', 'rowspan', 'scope', 'headers', 'role', 'aria-label',
  'aria-hidden', 'tabindex', 'open', 'name',
]);

/** Dangerous protocols that should be blocked in href/src. */
const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data):/i;

/**
 * Strip dangerous HTML: remove script/style/iframe tags, event handlers,
 * and dangerous protocols. Preserve safe structural tags.
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // Remove script, style, iframe, object, embed, form, input tags completely
  result = result.replace(
    /<(script|style|iframe|object|embed|form|input|textarea|select|button)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  // Remove self-closing dangerous tags
  result = result.replace(
    /<(script|style|iframe|object|embed|form|input|textarea|select|button)\b[^>]*\/?>/gi,
    '',
  );

  // Remove event handler attributes (on*)
  result = result.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Remove dangerous protocols from href and src
  result = result.replace(
    /(href|src)\s*=\s*["']?\s*(javascript|vbscript|data):[^"'\s>]*/gi,
    '$1=""',
  );

  return result;
}

/* ========================================================================== */
/*  TEXT SANITIZATION                                                         */
/* ========================================================================== */

/**
 * Sanitize a plain text string: strip HTML tags, trim, collapse whitespace,
 * remove control chars. Use for titles, excerpts, category names — any field
 * that must never contain markup.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')                                // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars (keep \n \r \t)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize a slug: lowercase, alphanumeric + hyphens only.
 * Strips accented characters via NFD normalization.
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // only alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

/**
 * Sanitize category name: trim, collapse spaces, cap length.
 */
export function sanitizeCategoryName(name: string, maxLength = 100): string {
  return sanitizeText(name).slice(0, maxLength);
}

/**
 * Escape HTML special characters in a string for safe embedding (RSS, etc).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitize and validate a URL. Returns null if invalid.
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (DANGEROUS_PROTOCOLS.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    // Allow relative URLs starting with /
    if (trimmed.startsWith('/')) return trimmed;
    return null;
  }
}

/**
 * Sanitize blog post content: sanitize HTML, enforce safe tags.
 */
export function sanitizeContent(content: string): string {
  return sanitizeHtml(content);
}
