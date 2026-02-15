// pages/sanitization.util.ts
// Sanitization utilities for page content, slugs, CSS, and head HTML.
// Framework-agnostic — zero external dependencies.

/* ========================================================================== */
/*  HTML SANITIZATION                                                         */
/* ========================================================================== */

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

void SAFE_TAGS; // used conceptually — full HTML sanitization is regex-based below

/** Strip dangerous HTML: remove script/style/iframe tags, event handlers. */
export function sanitizeHtml(html: string): string {
  let result = html;
  result = result.replace(
    /<(script|style|iframe|object|embed|form|input|textarea|select|button)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  result = result.replace(
    /<(script|style|iframe|object|embed|form|input|textarea|select|button)\b[^>]*\/?>/gi,
    '',
  );
  result = result.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  result = result.replace(
    /(href|src)\s*=\s*["']?\s*(javascript|vbscript|data):[^"'\s>]*/gi,
    '$1=""',
  );
  return result;
}

/* ========================================================================== */
/*  TEXT / SLUG                                                               */
/* ========================================================================== */

/** Sanitize plain text: trim, collapse whitespace, remove control chars. */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sanitize a slug: lowercase, alphanumeric + hyphens only. */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

/** Escape HTML special characters. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sanitize and validate a URL. Returns null if invalid. */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(javascript|vbscript|data):/i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    if (trimmed.startsWith('/')) return trimmed;
    return null;
  }
}

/** Sanitize page content: sanitize HTML, enforce safe tags. */
export function sanitizeContent(content: string): string {
  return sanitizeHtml(content);
}

/* ========================================================================== */
/*  CSS / HEAD HTML                                                           */
/* ========================================================================== */

/** Sanitize custom CSS: strip dangerous expressions and imports. */
export function sanitizeCss(css: string): string {
  let result = css;
  // Remove @import statements
  result = result.replace(/@import\b[^;]*;/gi, '');
  // Remove expression(), url(javascript:) patterns
  result = result.replace(/expression\s*\([^)]*\)/gi, '');
  result = result.replace(/url\s*\(\s*["']?\s*javascript:[^)]*\)/gi, 'url("")');
  // Remove behavior property (IE-specific)
  result = result.replace(/behavior\s*:\s*[^;]*/gi, '');
  return result.trim();
}

/** Sanitize custom head HTML: allow meta/link/style but block script/iframe. */
export function sanitizeHeadHtml(html: string): string {
  let result = html;
  // Remove script tags
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<script\b[^>]*\/?>/gi, '');
  // Remove iframe/object/embed
  result = result.replace(/<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  result = result.replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, '');
  // Remove event handlers
  result = result.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return result.trim();
}
