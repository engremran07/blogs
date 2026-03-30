// comments/spam.service.ts
// 13-signal spam analysis engine — pure TS, no framework dependency

import type {
  CommentsConfig,
  SpamCheckResult,
  RequestMeta,
  CommentConfigConsumer,
} from "../types";
import { SPAM_KEYWORDS, DEFAULT_CONFIG } from "./constants";
import { Sanitize } from "./sanitization";

/** Simple in-memory store for content hashes and IP tracking (TTL-based). */
const contentHashes = new Map<string, { count: number; firstSeen: number }>();
const ipCommentCounts = new Map<
  string,
  { count: number; windowStart: number }
>();
const HASH_TTL = 10 * 60 * 1000; // 10 minutes
const IP_WINDOW = 5 * 60 * 1000; // 5 minute sliding window
const IP_MAX_COMMENTS = 10; // max comments per IP per window

/** FNV-1a 32-bit hash for lightweight content fingerprinting */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

export class SpamService implements CommentConfigConsumer {
  private cfg: Required<CommentsConfig>;

  constructor(config: Partial<CommentsConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  /** Called by AdminSettingsService when admin changes settings */
  updateConfig(cfg: Required<CommentsConfig>): void {
    this.cfg = { ...cfg };
  }

  /** Run all signals, return aggregate result */
  analyse(
    content: string,
    authorName: string | undefined,
    authorEmail: string | undefined,
    meta?: RequestMeta,
  ): SpamCheckResult {
    const signals: string[] = [];
    let score = 0;

    const plain = Sanitize.text(content);

    // 1 — Link density
    const linkCount = (content.match(/https?:\/\//gi) || []).length;
    if (linkCount >= this.cfg.maxLinksBeforeSpam) {
      score += 30;
      signals.push(`excessive_links:${linkCount}`);
    }

    // 2 — Excessive caps
    if (plain.length >= this.cfg.capsCheckMinLength) {
      const upper = plain.replace(/[^A-Z]/g, "").length;
      const ratio = upper / plain.length;
      if (ratio >= this.cfg.capsSpamRatio) {
        score += 15;
        signals.push(`caps_ratio:${(ratio * 100).toFixed(0)}%`);
      }
    }

    // 3 — Keyword match
    const lower = plain.toLowerCase();
    const allKeywords = [...SPAM_KEYWORDS, ...this.cfg.customSpamKeywords];
    const matched = allKeywords.filter((kw) =>
      lower.includes(kw.toLowerCase()),
    );
    if (matched.length > 0) {
      score += 10 * matched.length;
      signals.push(`spam_keywords:${matched.join(",")}`);
    }

    // 4 — Duplicate characters (e.g. "aaaaaaa")
    if (/(.)\1{9,}/.test(plain)) {
      score += 20;
      signals.push("repeated_chars");
    }

    // 5 — Suspicious author name
    if (authorName) {
      const lowerName = authorName.toLowerCase();
      const nameKeywords = allKeywords.filter((kw) =>
        lowerName.includes(kw.toLowerCase()),
      );
      if (nameKeywords.length > 0) {
        score += 25;
        signals.push(`suspicious_author_name:${nameKeywords.join(",")}`);
      }
    }

    // 6 — Disposable email domains
    if (authorEmail) {
      const domain = authorEmail.split("@")[1]?.toLowerCase();
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        score += 20;
        signals.push(`disposable_email:${domain}`);
      }
    }

    // 7 — Content too short (single word/emoji spam)
    if (plain.length > 0 && plain.length < 3) {
      score += 10;
      signals.push("too_short");
    }

    // 8 — Bot-like metadata
    if (meta) {
      if (!meta.userAgent || meta.userAgent.length < 10) {
        score += 15;
        signals.push("missing_user_agent");
      }
    }

    // 9 — Base64 / encoded payloads
    if (/(?:data:|base64,|eval\(|javascript:)/i.test(content)) {
      score += 40;
      signals.push("encoded_payload");
    }

    // 10 — Blocked domains in links
    if (this.cfg.blockedDomains.length > 0) {
      const urls = content.match(/https?:\/\/[^\s"'>]+/gi) || [];
      for (const url of urls) {
        try {
          const hostname = new URL(url).hostname.toLowerCase();
          if (
            this.cfg.blockedDomains.some(
              (d) => hostname === d || hostname.endsWith(`.${d}`),
            )
          ) {
            score += 40;
            signals.push(`blocked_domain:${hostname}`);
          }
        } catch {
          /* invalid URL, skip */
        }
      }
    }

    // 11 — Blocked email in author
    if (authorEmail && this.cfg.blockedEmails.length > 0) {
      const email = authorEmail.toLowerCase();
      if (
        this.cfg.blockedEmails.some(
          (b) => email === b || email.endsWith(`@${b}`),
        )
      ) {
        score += 50;
        signals.push(`blocked_email:${email}`);
      }
    }

    // 12 — Repeat content detection (content hash fingerprinting)
    const contentHash = fnv1aHash(
      plain.toLowerCase().replace(/\s+/g, " ").trim(),
    );
    const now = Date.now();
    const existing = contentHashes.get(contentHash);
    if (existing && now - existing.firstSeen < HASH_TTL) {
      existing.count++;
      if (existing.count >= 3) {
        score += 25;
        signals.push(`repeat_content:${existing.count}`);
      }
    } else {
      contentHashes.set(contentHash, { count: 1, firstSeen: now });
    }
    // Evict stale entries periodically
    if (contentHashes.size > 5000) {
      for (const [key, val] of contentHashes) {
        if (now - val.firstSeen > HASH_TTL) contentHashes.delete(key);
      }
    }

    // 13 — Comment frequency per IP (rate-based spam detection)
    if (meta?.ipAddress) {
      const ipEntry = ipCommentCounts.get(meta.ipAddress);
      if (ipEntry && now - ipEntry.windowStart < IP_WINDOW) {
        ipEntry.count++;
        if (ipEntry.count > IP_MAX_COMMENTS) {
          score += 30;
          signals.push(`ip_flood:${ipEntry.count}/${IP_MAX_COMMENTS}`);
        }
      } else {
        ipCommentCounts.set(meta.ipAddress, { count: 1, windowStart: now });
      }
      // Evict stale IP entries
      if (ipCommentCounts.size > 10000) {
        for (const [key, val] of ipCommentCounts) {
          if (now - val.windowStart > IP_WINDOW) ipCommentCounts.delete(key);
        }
      }
    }

    const threshold = this.cfg.spamScoreThreshold ?? 50;

    return {
      isSpam: score >= threshold,
      score: Math.min(score, 100),
      reasons: signals,
      signals,
    };
  }

  /** Profanity filter — replaces matched words with asterisks */
  filterProfanity(text: string): string {
    if (!this.cfg.enableProfanityFilter || this.cfg.profanityWords.length === 0)
      return text;
    let result = text;
    for (const word of this.cfg.profanityWords) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      result = result.replace(regex, "*".repeat(word.length));
    }
    return result;
  }
}

// ─── Common disposable email providers ──────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com",
  "throwaway.email",
  "guerrillamail.com",
  "mailinator.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "tempr.email",
  "tempail.com",
  "fakeinbox.com",
  "maildrop.cc",
  "10minutemail.com",
  "mohmal.com",
  "temp-mail.org",
  "getnada.com",
  "emailondeck.com",
  "mintemail.com",
]);
