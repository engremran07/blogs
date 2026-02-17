// media-manager/sanitization.util.ts
// ─────────────────────────────────────────────────────────────────────────────
// Filename, folder‑name, alt‑text, and URL sanitisation utilities.
// Includes SSRF protection for upload‑from‑URL flows.
// **Zero external dependencies** — pure string processing.
// ─────────────────────────────────────────────────────────────────────────────

import { MEDIA_LIMITS, BLOCKED_EXTENSIONS } from './constants';
import type { UpdateMediaInput, UploadFromUrlInput } from '../types';

/* ====================================================================== *
 *  Filename sanitisation                                                 *
 * ====================================================================== */

/**
 * Sanitise a user‑provided filename for safe storage.
 *
 * - Normalise unicode & strip diacritics
 * - Remove path components (directory traversal)
 * - Strip null bytes and control characters
 * - Replace unsafe characters with dashes
 * - Reject blocked / dangerous extensions (including double‑extension tricks)
 * - Collapse consecutive separators
 * - Truncate to `MAX_FILENAME_LENGTH`
 * - Preserve extension
 */
export function sanitizeFilename(name: string): string {
  // 1. Strip directory components
  let safe = name.replace(/^.*[\\/]/, '');

  // 2. Remove null bytes and control characters
  safe = safe.replace(/[\x00-\x1f\x7f]/g, '');

  // 3. Normalise unicode and strip diacritics
  safe = safe.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3b. Block dangerous extensions (check ALL dot segments for double‑extension tricks)
  const segments = safe.split('.');
  for (let i = 1; i < segments.length; i++) {
    if (BLOCKED_EXTENSIONS.has(segments[i].toLowerCase())) {
      throw new Error(`Blocked file extension: .${segments[i].toLowerCase()}`);
    }
  }

  // 4. Separate extension to preserve it
  const dotIdx = safe.lastIndexOf('.');
  let stem = dotIdx > 0 ? safe.slice(0, dotIdx) : safe;
  const ext  = dotIdx > 0 ? safe.slice(dotIdx + 1).toLowerCase() : '';

  // 5. Replace unsafe characters in stem
  stem = stem
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/[-_]{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');

  // 6. Fallback for empty stem
  if (!stem) stem = 'file';

  // 7. Reassemble and truncate
  const result = ext ? `${stem}.${ext}` : stem;
  return result.slice(0, MEDIA_LIMITS.MAX_FILENAME_LENGTH);
}

/* ====================================================================== *
 *  Folder‑name sanitisation                                              *
 * ====================================================================== */

/**
 * Sanitise a folder name:
 * - Block path traversal patterns (`..`, `./`)
 * - Block absolute paths
 * - Strip filesystem‑unsafe characters
 * - Normalise separators
 */
export function sanitizeFolderName(name: string): string {
  // Block traversal
  if (/\.\./.test(name)) {
    throw new Error('Path traversal not allowed in folder name');
  }

  let safe = name.trim();

  // Block absolute paths
  if (/^[/\\]/.test(safe) || /^[a-zA-Z]:/.test(safe)) {
    throw new Error('Absolute paths not allowed in folder name');
  }

  // Strip dangerous characters
  safe = safe
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .replace(/[/\\]+/g, '/')       // normalise separators
    .replace(/^\/+|\/+$/g, '');    // trim leading/trailing slashes

  return safe.slice(0, MEDIA_LIMITS.MAX_FOLDER_NAME_LENGTH) || 'uploads';
}

/* ====================================================================== *
 *  Alt‑text sanitisation                                                 *
 * ====================================================================== */

/**
 * Sanitise image alt text:
 * - Strip HTML tags
 * - Collapse whitespace
 * - Truncate to `MAX_ALT_TEXT_LENGTH` (aligned with SEO module)
 */
export function sanitizeAltText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')                      // strip HTML tags
    .replace(/&[a-z]+;/gi, ' ')                   // strip HTML entities
    .replace(/\s+/g, ' ')                         // collapse whitespace
    .trim()
    .slice(0, MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH);
}

/* ====================================================================== *
 *  Title & description sanitisation                                      *
 * ====================================================================== */

/** Sanitise a title field. */
export function sanitizeTitle(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MEDIA_LIMITS.MAX_TITLE_LENGTH);
}

/** Sanitise a description field. */
export function sanitizeDescription(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH);
}

/* ====================================================================== *
 *  Tag sanitisation                                                      *
 * ====================================================================== */

/**
 * Sanitise and de‑duplicate a tags array.
 */
export function sanitizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const raw of tags) {
    const tag = raw
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .slice(0, MEDIA_LIMITS.MAX_TAG_LENGTH);

    if (tag && !seen.has(tag) && clean.length < MEDIA_LIMITS.MAX_TAGS) {
      seen.add(tag);
      clean.push(tag);
    }
  }

  return clean;
}

/* ====================================================================== *
 *  Composite input sanitiser                                             *
 * ====================================================================== */

/**
 * Apply all field‑level sanitisers to a media update payload.
 * Returns a new object — does not mutate the input.
 */
export function sanitizeMediaInput<T extends Partial<UpdateMediaInput>>(input: T): T {
  const result = { ...input };

  if (result.altText != null) {
    result.altText = sanitizeAltText(result.altText);
  }
  if (result.title != null) {
    result.title = sanitizeTitle(result.title);
  }
  if (result.description != null) {
    result.description = sanitizeDescription(result.description);
  }
  if (result.tags) {
    result.tags = sanitizeTags(result.tags);
  }
  if (result.folder) {
    result.folder = sanitizeFolderName(result.folder);
  }

  return result;
}

/* ====================================================================== *
 *  URL sanitisation & SSRF protection                                    *
 * ====================================================================== */

/** Dangerous URL protocols that must never be fetched. */
const BLOCKED_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'ftp:',
] as const;

/** IPv4 private / reserved ranges (CIDR). */
const PRIVATE_IPV4_RANGES = [
  { prefix: '10.',       label: 'RFC 1918' },
  { prefix: '127.',      label: 'Loopback' },
  { prefix: '169.254.',  label: 'Link‑local' },
  { prefix: '192.168.',  label: 'RFC 1918' },
  { prefix: '0.',        label: 'Current network' },
  { prefix: '100.64.',   label: 'Carrier‑grade NAT' },
  { prefix: '198.18.',   label: 'Benchmarking' },
  { prefix: '198.19.',   label: 'Benchmarking' },
  { prefix: '192.0.0.',  label: 'IETF protocol' },
  { prefix: '192.0.2.',  label: 'Documentation' },
  { prefix: '198.51.100.', label: 'Documentation' },
  { prefix: '203.0.113.', label: 'Documentation' },
  { prefix: '224.',      label: 'Multicast' },
  { prefix: '240.',      label: 'Reserved' },
  { prefix: '255.',      label: 'Broadcast' },
];

/** 172.16.0.0 – 172.31.255.255  */
function is172Private(ip: string): boolean {
  if (!ip.startsWith('172.')) return false;
  const second = parseInt(ip.split('.')[1], 10);
  return second >= 16 && second <= 31;
}

/**
 * Sanitise a URL for safe embedding / display:
 * - Block dangerous protocols
 * - Strip control characters
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().replace(/[\x00-\x1f\x7f]/g, '');

  for (const proto of BLOCKED_PROTOCOLS) {
    if (trimmed.toLowerCase().startsWith(proto)) {
      throw new Error(`Blocked protocol: ${proto}`);
    }
  }

  return trimmed;
}

/**
 * Check whether a hostname / IP resolves to a private or reserved
 * address.  Used to prevent SSRF in upload‑from‑URL flows.
 *
 * Returns `true` if the URL targets a private/reserved address.
 *
 * **Note:** This performs a *synchronous* check against the hostname
 * string.  For production use, also perform a DNS‑resolution check
 * at the network layer.
 */
export function isPrivateUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true; // malformed → block
  }

  const hostname = parsed.hostname.toLowerCase();

  // IPv6 loopback
  if (hostname === '[::1]' || hostname === '::1') return true;

  // localhost
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') return true;

  // IPv4 checks
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    for (const range of PRIVATE_IPV4_RANGES) {
      if (hostname.startsWith(range.prefix)) return true;
    }
    if (is172Private(hostname)) return true;
    // 0.0.0.0
    if (hostname === '0.0.0.0') return true;
  }

  // IPv6 private ranges (simplified)
  if (hostname.startsWith('[')) {
    const inner = hostname.slice(1, -1).toLowerCase();
    if (inner.startsWith('fc') || inner.startsWith('fd')) return true;   // unique local
    if (inner.startsWith('fe80'))                         return true;   // link‑local
    if (inner === '::1')                                  return true;   // loopback
  }

  // .internal / .local TLDs
  if (hostname.endsWith('.internal') || hostname.endsWith('.local')) return true;

  return false;
}

/**
 * Full validation of an upload‑from‑URL input.
 * Throws if the URL is unsafe.
 */
export function validateUploadUrl(input: UploadFromUrlInput): void {
  // Protocol check
  const lower = input.url.trim().toLowerCase();
  if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
    throw new Error('Only HTTP and HTTPS URLs are allowed');
  }

  for (const proto of BLOCKED_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      throw new Error(`Blocked protocol: ${proto}`);
    }
  }

  // SSRF check
  if (isPrivateUrl(input.url)) {
    throw new Error('URL resolves to a private or reserved address');
  }

  // Parse check
  try {
    new URL(input.url);
  } catch {
    throw new Error('Invalid URL format');
  }
}
