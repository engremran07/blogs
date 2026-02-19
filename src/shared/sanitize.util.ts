/**
 * ============================================================================
 * MODULE  : shared/sanitize.util.ts
 * PURPOSE : Single source of truth for sanitization across the entire app.
 *           Auth, Blog, Comments, and any future module should delegate here.
 * PATTERN : Pure functions, zero dependencies, framework-agnostic.
 * ============================================================================
 */

/* ========================================================================== */
/*  Constants                                                                 */
/* ========================================================================== */

/** Tags whose content (not just tag) must be removed. */
const DANGEROUS_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed',
  'form', 'input', 'textarea', 'select', 'button',
] as const;

const DANGEROUS_TAG_PATTERN = DANGEROUS_TAGS.join('|');

/** Protocols that are XSS vectors. */
const DANGEROUS_PROTOCOL_RE = /^(javascript|vbscript|data):/i;

/** Entity decode map. */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/* ========================================================================== */
/*  HTML Sanitization                                                         */
/* ========================================================================== */

/**
 * Strip dangerous HTML tags (with content), event handlers, and dangerous
 * protocols while preserving safe structural markup.
 *
 * This is the CANONICAL implementation — all modules should call this
 * instead of maintaining their own regex-based sanitizers.
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // Pass 1: Remove dangerous tags WITH their content
  result = result.replace(
    new RegExp(`<(${DANGEROUS_TAG_PATTERN})\\b[^>]*>[\\s\\S]*?<\\/\\1>`, 'gi'),
    '',
  );

  // Pass 2a: Remove self-closing dangerous tags (e.g. <script />, <input />)
  result = result.replace(
    new RegExp(`<(${DANGEROUS_TAG_PATTERN})\\b[^>]*/\\s*>`, 'gi'),
    '',
  );

  // Pass 2b: Remove unclosed dangerous tags AND any trailing content
  // (browsers treat everything after an unclosed <script> as script content)
  result = result.replace(
    new RegExp(`<(${DANGEROUS_TAG_PATTERN})\\b[^>]*>[\\s\\S]*`, 'gi'),
    '',
  );

  // Pass 3: Remove orphaned closing tags
  result = result.replace(
    new RegExp(`<\\/(${DANGEROUS_TAG_PATTERN})\\s*>`, 'gi'),
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
/*  Text Sanitization                                                         */
/* ========================================================================== */

/**
 * Strip ALL HTML (including dangerous tag content), decode entities,
 * collapse whitespace. Safe for titles, names, excerpts, etc.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  // Remove dangerous tags WITH content first
  let sanitized = text.replace(
    new RegExp(`<(${DANGEROUS_TAG_PATTERN})\\b[\\s\\S]*?<\\/\\1>`, 'gi'),
    '',
  );
  sanitized = sanitized.replace(
    new RegExp(`<(${DANGEROUS_TAG_PATTERN})\\b[^>]*\\/?>`, 'gi'),
    '',
  );
  // Strip remaining tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  // Remove control characters (keep \n \r \t)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Decode entities
  sanitized = decodeEntities(sanitized);
  return sanitized.trim().replace(/\s+/g, ' ');
}

/* ========================================================================== */
/*  Slug Sanitization                                                         */
/* ========================================================================== */

/**
 * Convert a string to a URL-safe slug.
 * Strips diacriticals via NFD, lowercases, limits to maxLength.
 */
export function sanitizeSlug(text: string, maxLength = 200): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // only alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, maxLength);
}

/* ========================================================================== */
/*  Email Sanitization                                                        */
/* ========================================================================== */

/**
 * Validate and normalize an email address.
 * Returns lowercase trimmed email or null if invalid.
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : null;
}

/* ========================================================================== */
/*  URL Sanitization                                                          */
/* ========================================================================== */

/**
 * Sanitize and validate a URL. Blocks dangerous protocols.
 *
 * @param url              The URL to validate
 * @param allowRelative    If true, accept URLs starting with `/`
 * @returns                The validated URL string, or null
 */
export function sanitizeUrl(url: string, allowRelative = false): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Block dangerous protocols
  if (DANGEROUS_PROTOCOL_RE.test(trimmed)) return null;

  // Check for valid absolute http(s) URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      new URL(trimmed);
      return trimmed; // Return original to avoid normalization artefacts
    } catch {
      return null;
    }
  }

  // Allow relative URLs if requested
  if (allowRelative && trimmed.startsWith('/')) return trimmed;

  return null;
}

/* ========================================================================== */
/*  HTML Escaping                                                             */
/* ========================================================================== */

/**
 * Escape HTML special characters for safe embedding in HTML context (RSS, etc).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

function decodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|nbsp);/g,
    (match) => HTML_ENTITIES[match] || match,
  );
}
