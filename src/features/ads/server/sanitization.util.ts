// src/features/ads/server/sanitization.util.ts
import { TRUSTED_AD_SCRIPT_DOMAINS } from "./constants";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;",
  '"': "&quot;", "'": "&#39;",
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

export function escapeHtmlAttr(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

const DANGEROUS_PATTERNS = [
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /eval\s*\(/gi,
  /document\.(cookie|write|location)/gi,
  /window\.(location|open)/gi,
  /innerHTML\s*=/gi,
  /<\s*iframe[^>]*src\s*=\s*["']?(?!https:\/\/)/gi,
  /data\s*:\s*text\/html/gi,
];

export interface DangerousMatch {
  pattern: string;
  index: number;
  match: string;
}

export function detectDangerousPatterns(code: string): DangerousMatch[] {
  const results: DangerousMatch[] = [];
  for (const pattern of DANGEROUS_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      results.push({ pattern: pattern.source, index: m.index, match: m[0] });
    }
  }
  return results;
}

export interface UntrustedScript {
  src: string;
  index: number;
}

export function findUntrustedScripts(code: string): UntrustedScript[] {
  const results: UntrustedScript[] = [];
  const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(code)) !== null) {
    const src = m[1];
    try {
      const hostname = new URL(src).hostname;
      if (!TRUSTED_AD_SCRIPT_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        results.push({ src, index: m.index });
      }
    } catch {
      results.push({ src, index: m.index });
    }
  }
  return results;
}

/** Maximum allowed length for ad code / custom HTML content. */
const MAX_AD_CONTENT_LENGTH = 100_000;

/** Allowed URL protocols for ad links and images. */
const SAFE_URL_PROTOCOLS = ["http:", "https:"];

/**
 * Validate and sanitize a URL. Returns the URL if safe, or an empty string.
 * Allows only http / https for general URLs.
 * When `allowDataImages` is true, also allows `data:image/*` URIs.
 */
export function sanitizeUrl(
  url: string | null | undefined,
  opts: { allowDataImages?: boolean } = {},
): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.length === 0) return "";

  // Reject any embedded whitespace / control characters that could smuggle a different protocol
  if (/[\s\x00-\x1f]/g.test(trimmed.split("://")[0] ?? "")) return "";

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (SAFE_URL_PROTOCOLS.includes(protocol)) return trimmed;

    if (opts.allowDataImages && protocol === "data:") {
      // Only allow data:image/* — block data:text/html etc.
      if (/^data:image\//i.test(trimmed)) return trimmed;
      return "";
    }

    return "";
  } catch {
    // Relative URLs or paths are acceptable (e.g. "/images/ad.png")
    if (trimmed.startsWith("/")) return trimmed;
    return "";
  }
}

/**
 * HTML-escape a plain-text alt attribute value.
 */
export function sanitizeAltText(
  alt: string | null | undefined,
  maxLength = 256,
): string {
  if (!alt || typeof alt !== "string") return "";
  const trimmed = alt.trim().slice(0, maxLength);
  return escapeHtmlAttr(trimmed);
}

export function sanitizeAdCode(code: string): string {
  if (typeof code !== "string") return "";
  let sanitized = code.slice(0, MAX_AD_CONTENT_LENGTH);
  sanitized = sanitized.replace(/javascript\s*:/gi, "");
  sanitized = sanitized.replace(/on(\w+)\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on(\w+)\s*=\s*[^\s>]+/gi, "");
  return sanitized;
}

export function sanitizeCustomHtml(html: string): string {
  if (typeof html !== "string") return "";
  return sanitizeAdCode(html.slice(0, MAX_AD_CONTENT_LENGTH));
}
