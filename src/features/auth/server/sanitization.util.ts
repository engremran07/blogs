/**
 * ============================================================================
 * MODULE:   features/auth/sanitization.util.ts
 * PURPOSE:  Auth module sanitization — delegates to shared/sanitize.util.ts.
 *           Maintains backward-compatible public API.
 * ============================================================================
 */

import {
  sanitizeText as _sanitizeText,
  sanitizeEmail as _sanitizeEmail,
  sanitizeUrl as _sanitizeUrl,
  sanitizeSlug as _sanitizeSlug,
} from '@/shared/sanitize.util';

/** Strip HTML (including script/style content), decode entities, collapse whitespace. */
export function sanitizeText(text: string): string {
  return _sanitizeText(text);
}

/** Validate and normalise an email address. Returns lowercase or null. */
export function sanitizeEmail(email: string): string | null {
  return _sanitizeEmail(email);
}

/** Validate a URL — only http/https schemes allowed. No relative URLs. */
export function sanitizeURL(url: string): string | null {
  return _sanitizeUrl(url, false);
}

/** Convert a string to a URL-safe slug. */
export function sanitizeSlug(slug: string): string {
  return _sanitizeSlug(slug, 200);
}
