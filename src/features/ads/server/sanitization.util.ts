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

export function sanitizeAdCode(code: string): string {
  let sanitized = code;
  sanitized = sanitized.replace(/javascript\s*:/gi, "");
  sanitized = sanitized.replace(/on(\w+)\s*=\s*["'][^"']*["']/gi, "");
  return sanitized;
}

export function sanitizeCustomHtml(html: string): string {
  return sanitizeAdCode(html);
}
