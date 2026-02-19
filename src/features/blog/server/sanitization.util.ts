// blog/sanitization.util.ts
// Blog sanitization — delegates to shared/sanitize.util.ts.
// Maintains backward-compatible public API.

import {
  sanitizeHtml as _sanitizeHtml,
  sanitizeText as _sanitizeText,
  sanitizeSlug as _sanitizeSlug,
  sanitizeUrl as _sanitizeUrl,
  sanitizeEmail as _sanitizeEmail,
  escapeHtml as _escapeHtml,
} from '@/shared/sanitize.util';

/* ========================================================================== */
/*  HTML SANITIZATION                                                         */
/* ========================================================================== */

/** Strip dangerous HTML: scripts, event handlers, dangerous protocols. */
export function sanitizeHtml(html: string): string {
  return _sanitizeHtml(html);
}

/* ========================================================================== */
/*  TEXT SANITIZATION                                                         */
/* ========================================================================== */

/** Sanitize plain text: strip HTML, control chars, collapse whitespace. */
export function sanitizeText(text: string): string {
  return _sanitizeText(text);
}

/** Sanitize a slug: lowercase, alphanumeric + hyphens, strip diacriticals. */
export function sanitizeSlug(slug: string): string {
  return _sanitizeSlug(slug);
}

/** Sanitize category name: trim, collapse spaces, cap length. */
export function sanitizeCategoryName(name: string, maxLength = 100): string {
  return sanitizeText(name).slice(0, maxLength);
}

/** Escape HTML special characters for safe embedding (RSS, etc). */
export function escapeHtml(text: string): string {
  return _escapeHtml(text);
}

/** Sanitize and validate a URL. Allows relative URLs starting with /. */
export function sanitizeUrl(url: string): string | null {
  return _sanitizeUrl(url, true);
}

/** Sanitize blog post content: sanitize HTML, enforce safe tags. */
export function sanitizeContent(content: string): string {
  return sanitizeHtml(content);
}
