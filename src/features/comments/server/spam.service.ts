// comments/spam.service.ts
// 9-signal spam analysis engine — pure TS, no framework dependency

import type { CommentsConfig, SpamCheckResult, RequestMeta, CommentConfigConsumer } from '../types';
import { SPAM_KEYWORDS, DEFAULT_CONFIG } from './constants';
import { Sanitize } from './sanitization';

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
      const upper = plain.replace(/[^A-Z]/g, '').length;
      const ratio = upper / plain.length;
      if (ratio >= this.cfg.capsSpamRatio) {
        score += 15;
        signals.push(`caps_ratio:${(ratio * 100).toFixed(0)}%`);
      }
    }

    // 3 — Keyword match
    const lower = plain.toLowerCase();
    const allKeywords = [...SPAM_KEYWORDS, ...this.cfg.customSpamKeywords];
    const matched = allKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (matched.length > 0) {
      score += 10 * matched.length;
      signals.push(`spam_keywords:${matched.join(',')}`);
    }

    // 4 — Duplicate characters (e.g. "aaaaaaa")
    if (/(.)\1{9,}/.test(plain)) {
      score += 20;
      signals.push('repeated_chars');
    }

    // 5 — Suspicious author name
    if (authorName) {
      const lowerName = authorName.toLowerCase();
      const nameKeywords = allKeywords.filter((kw) => lowerName.includes(kw.toLowerCase()));
      if (nameKeywords.length > 0) {
        score += 25;
        signals.push(`suspicious_author_name:${nameKeywords.join(',')}`);
      }
    }

    // 6 — Disposable email domains
    if (authorEmail) {
      const domain = authorEmail.split('@')[1]?.toLowerCase();
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        score += 20;
        signals.push(`disposable_email:${domain}`);
      }
    }

    // 7 — Content too short (single word/emoji spam)
    if (plain.length > 0 && plain.length < 3) {
      score += 10;
      signals.push('too_short');
    }

    // 8 — Bot-like metadata
    if (meta) {
      if (!meta.userAgent || meta.userAgent.length < 10) {
        score += 15;
        signals.push('missing_user_agent');
      }
    }

    // 9 — Base64 / encoded payloads
    if (/(?:data:|base64,|eval\(|javascript:)/i.test(content)) {
      score += 40;
      signals.push('encoded_payload');
    }

    // 10 — Blocked domains in links
    if (this.cfg.blockedDomains.length > 0) {
      const urls = content.match(/https?:\/\/[^\s"'>]+/gi) || [];
      for (const url of urls) {
        try {
          const hostname = new URL(url).hostname.toLowerCase();
          if (this.cfg.blockedDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
            score += 40;
            signals.push(`blocked_domain:${hostname}`);
          }
        } catch { /* invalid URL, skip */ }
      }
    }

    // 11 — Blocked email in author
    if (authorEmail && this.cfg.blockedEmails.length > 0) {
      const email = authorEmail.toLowerCase();
      if (this.cfg.blockedEmails.some((b) => email === b || email.endsWith(`@${b}`))) {
        score += 50;
        signals.push(`blocked_email:${email}`);
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
    if (!this.cfg.enableProfanityFilter || this.cfg.profanityWords.length === 0) return text;
    let result = text;
    for (const word of this.cfg.profanityWords) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      result = result.replace(regex, '*'.repeat(word.length));
    }
    return result;
  }
}

// ─── Common disposable email providers ──────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'trashmail.com', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'dispostable.com', 'tempr.email', 'tempail.com',
  'fakeinbox.com', 'maildrop.cc', '10minutemail.com', 'mohmal.com',
  'temp-mail.org', 'getnada.com', 'emailondeck.com', 'mintemail.com',
]);
