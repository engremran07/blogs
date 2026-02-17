/**
 * ============================================================================
 * MODULE  : seo/seo-text.util.ts
 * PURPOSE : Pure text-analysis utilities — keyword extraction, title/desc
 *           generation, reading time, slug validation, title quality scoring
 * PATTERN : Framework-agnostic, zero side-effects, deterministic
 * ============================================================================
 */

import type {
  SeoKeywordIntent,
  KeywordAnalysis,
  TitleQualityScore,
} from '../types';
import {
  STOP_WORDS,
  POWER_WORDS,
  EMOTIONAL_WORDS,
  INTENT_PATTERNS,
  READING_TIME_WPM,
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  META_DESCRIPTION_MIN_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  SLUG_MAX_LENGTH,
  SLUG_MAX_WORDS,
} from './constants';
import { stripHtml, countWords } from '@/shared/text.util';

/* ========================================================================== */
/*  SECTION 1 — HTML / Text Helpers                                           */
/* ========================================================================== */

export { stripHtml, countWords } from '@/shared/text.util';

/** Tokenise text into lowercase words. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Slugify a string for URL use. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ========================================================================== */
/*  SECTION 2 — Keyword Extraction                                            */
/* ========================================================================== */

/**
 * Extract keywords from text using frequency analysis with stop-word removal.
 * Returns sorted by frequency descending.
 */
export function extractKeywords(
  text: string,
  maxKeywords: number = 10,
): KeywordAnalysis[] {
  const plainText = stripHtml(text);
  const words = tokenize(plainText);
  const totalWords = words.length;
  if (totalWords === 0) return [];

  // Single-word frequencies
  const freq = new Map<string, { count: number; firstPos: number }>();
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (STOP_WORDS.has(w) || w.length < 3) continue;
    const existing = freq.get(w);
    if (existing) {
      existing.count++;
    } else {
      freq.set(w, { count: 1, firstPos: i });
    }
  }

  // Bi-gram extraction for compound keywords
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
    if (w1.length < 3 || w2.length < 3) continue;
    const bigram = `${w1} ${w2}`;
    const existing = freq.get(bigram);
    if (existing) {
      existing.count++;
    } else {
      freq.set(bigram, { count: 1, firstPos: i });
    }
  }

  // Build analysis objects
  const analyses: KeywordAnalysis[] = [];
  for (const [term, { count, firstPos }] of freq) {
    if (count < 2 && !term.includes(' ')) continue; // require at least 2 occurrences for single words
    const density = (count / totalWords) * 100;
    const prominence = 1 - firstPos / totalWords; // earlier = higher
    const intent = inferKeywordIntent(term);
    analyses.push({ term, frequency: count, density, intent, prominence });
  }

  // Sort by weighted score: frequency * prominence
  analyses.sort(
    (a, b) =>
      b.frequency * b.prominence - a.frequency * a.prominence,
  );

  return analyses.slice(0, maxKeywords);
}

/**
 * Extract keywords specifically from an array of strings (tags, categories, etc.).
 */
export function extractKeywordsFromTerms(
  terms: string[],
  source: string = 'terms',
): KeywordAnalysis[] {
  const freq = new Map<string, number>();
  for (const term of terms) {
    const normalized = term.toLowerCase().trim();
    if (!normalized) continue;
    freq.set(normalized, (freq.get(normalized) ?? 0) + 1);
  }

  return Array.from(freq.entries()).map(([term, count]) => ({
    term,
    frequency: count,
    density: 0,
    intent: inferKeywordIntent(term),
    prominence: 1,
  }));
}

/* ========================================================================== */
/*  SECTION 3 — Keyword Intent Classification                                 */
/* ========================================================================== */

/** Infer the search intent of a keyword or phrase. */
export function inferKeywordIntent(keyword: string): SeoKeywordIntent {
  const kw = keyword.toLowerCase();

  if (INTENT_PATTERNS.TRANSACTIONAL.test(kw)) return 'TRANSACTIONAL';
  if (INTENT_PATTERNS.LOCAL.test(kw)) return 'LOCAL';
  if (INTENT_PATTERNS.COMMERCIAL.test(kw)) return 'COMMERCIAL';
  if (INTENT_PATTERNS.NAVIGATIONAL.test(kw)) return 'NAVIGATIONAL';
  if (INTENT_PATTERNS.INFORMATIONAL.test(kw)) return 'INFORMATIONAL';
  return 'OTHER';
}

/* ========================================================================== */
/*  SECTION 4 — Title & Description Generation                                */
/* ========================================================================== */

/**
 * Generate an SEO-optimised title from content title and keywords.
 * Ensures optimal length and includes power words when possible.
 */
export function generateSeoTitle(
  title: string,
  keywords: string[] = [],
  siteName?: string,
): string {
  let seoTitle = title.trim();

  // If title is too short and we have a site name, append it
  if (seoTitle.length < TITLE_MIN_LENGTH && siteName) {
    const withSite = `${seoTitle} | ${siteName}`;
    if (withSite.length <= TITLE_MAX_LENGTH) {
      seoTitle = withSite;
    }
  }

  // If still too short and we have keywords, try to incorporate the primary keyword
  if (seoTitle.length < TITLE_MIN_LENGTH && keywords.length > 0) {
    const primaryKw = keywords[0];
    if (!seoTitle.toLowerCase().includes(primaryKw.toLowerCase())) {
      const expanded = `${seoTitle}: ${capitalize(primaryKw)}`;
      if (expanded.length <= TITLE_MAX_LENGTH) {
        seoTitle = expanded;
      }
    }
  }

  // Truncate if too long
  if (seoTitle.length > TITLE_MAX_LENGTH) {
    seoTitle = seoTitle.substring(0, TITLE_MAX_LENGTH - 3).replace(/\s+\S*$/, '') + '...';
  }

  return seoTitle;
}

/**
 * Generate an SEO meta description from content.
 * Extracts the most relevant sentences and ensures keyword presence.
 */
export function generateSeoDescription(
  content: string,
  keywords: string[] = [],
  maxLength: number = META_DESCRIPTION_MAX_LENGTH,
): string {
  const plainText = stripHtml(content);
  if (!plainText) return '';

  // Split into sentences
  const sentences = plainText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  // Score sentences by keyword relevance
  const scored = sentences.map((sentence) => {
    let score = 0;
    const lower = sentence.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score += 10;
    }
    // Prefer earlier sentences
    score += 5 - sentences.indexOf(sentence) * 0.5;
    // Prefer sentences of optimal length
    if (sentence.length >= 50 && sentence.length <= 160) score += 3;
    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Build description from top sentences
  let desc = '';
  for (const { sentence } of scored) {
    const candidate = desc ? `${desc}. ${sentence}` : sentence;
    if (candidate.length > maxLength) break;
    desc = candidate;
  }

  if (!desc) {
    desc = scored[0].sentence;
  }

  // Ensure length constraints
  if (desc.length > maxLength) {
    desc = desc.substring(0, maxLength - 3).replace(/\s+\S*$/, '') + '...';
  }

  if (desc.length < META_DESCRIPTION_MIN_LENGTH && sentences.length > 1) {
    // Try to append more text
    const remaining = sentences.find((s) => !desc.includes(s));
    if (remaining) {
      const extended = `${desc}. ${remaining}`;
      if (extended.length <= maxLength) {
        desc = extended;
      }
    }
  }

  return desc;
}

/* ========================================================================== */
/*  SECTION 5 — Reading Time & Word Count                                     */
/* ========================================================================== */

/** Calculate reading time in minutes. */
export function calculateReadingTime(
  content: string,
  wpm: number = READING_TIME_WPM,
): number {
  const wordCount = countWords(content);
  return Math.max(1, Math.ceil(wordCount / wpm));
}

/* ========================================================================== */
/*  SECTION 6 — Slug Validation                                               */
/* ========================================================================== */

export interface SlugValidationResult {
  valid: boolean;
  issues: string[];
  normalized: string;
}

/** Validate and normalise a URL slug. */
export function validateSlug(slug: string): SlugValidationResult {
  const issues: string[] = [];
  let normalized = slug.toLowerCase().trim();

  if (!normalized) {
    return { valid: false, issues: ['Slug is empty.'], normalized: '' };
  }

  if (/[A-Z]/.test(slug)) issues.push('Contains uppercase letters.');
  if (/[_\s]/.test(slug)) {
    issues.push('Contains underscores or spaces.');
    normalized = normalized.replace(/[_\s]+/g, '-');
  }
  if (/--/.test(normalized)) {
    issues.push('Contains consecutive hyphens.');
    normalized = normalized.replace(/-{2,}/g, '-');
  }
  if (/[^a-z0-9-]/.test(normalized)) {
    issues.push('Contains invalid characters.');
    normalized = normalized.replace(/[^a-z0-9-]/g, '');
  }
  if (normalized.length > SLUG_MAX_LENGTH) {
    issues.push(`Exceeds ${SLUG_MAX_LENGTH} characters.`);
  }
  const wordCount = normalized.split('-').filter(Boolean).length;
  if (wordCount > SLUG_MAX_WORDS) {
    issues.push(`Has ${wordCount} words — aim for ${SLUG_MAX_WORDS} or fewer.`);
  }
  if (/^-/.test(normalized)) normalized = normalized.replace(/^-+/, '');
  if (/-$/.test(normalized)) normalized = normalized.replace(/-+$/, '');

  return { valid: issues.length === 0, issues, normalized };
}

/* ========================================================================== */
/*  SECTION 7 — Title Quality Scoring                                         */
/* ========================================================================== */

/** Score the quality of an SEO title (0–100). */
export function scoreTitleQuality(title: string): TitleQualityScore {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const words = tokenize(title);

  // --- Length Score (0–25) ---
  let lengthScore: number;
  const len = title.length;
  if (len >= TITLE_MIN_LENGTH && len <= TITLE_MAX_LENGTH) {
    lengthScore = 25;
  } else if (len < TITLE_MIN_LENGTH) {
    lengthScore = Math.round((len / TITLE_MIN_LENGTH) * 20);
    issues.push(`Title too short (${len} chars).`);
    suggestions.push(`Expand to ${TITLE_MIN_LENGTH}–${TITLE_MAX_LENGTH} characters.`);
  } else {
    lengthScore = Math.max(5, 25 - (len - TITLE_MAX_LENGTH));
    issues.push(`Title too long (${len} chars).`);
    suggestions.push(`Shorten to ${TITLE_MAX_LENGTH} characters or fewer.`);
  }

  // --- Power Word Score (0–25) ---
  const powerWordsFound: string[] = [];
  for (const word of words) {
    if (POWER_WORDS.has(word)) powerWordsFound.push(word);
  }
  let powerWordScore: number;
  if (powerWordsFound.length >= 2) {
    powerWordScore = 25;
  } else if (powerWordsFound.length === 1) {
    powerWordScore = 18;
  } else {
    powerWordScore = 5;
    suggestions.push('Add a power word (e.g., "ultimate", "proven", "essential").');
  }

  // --- Emotional Score (0–20) ---
  const emotionalWordsFound: string[] = [];
  for (const word of words) {
    if (EMOTIONAL_WORDS.has(word)) emotionalWordsFound.push(word);
  }
  let emotionalScore: number;
  if (emotionalWordsFound.length >= 2) {
    emotionalScore = 20;
  } else if (emotionalWordsFound.length === 1) {
    emotionalScore = 14;
  } else {
    emotionalScore = 4;
  }

  // --- Clickability Score (0–15) ---
  let clickabilityScore = 5;
  // Number in title increases CTR
  if (/\d/.test(title)) {
    clickabilityScore += 3;
  } else {
    suggestions.push('Consider adding a number (e.g., "7 Ways", "Top 10").');
  }
  // Parentheses/brackets signal bonus content
  if (/[\[\(]/.test(title)) clickabilityScore += 2;
  // Question format
  if (/\?$/.test(title.trim())) clickabilityScore += 2;
  // Year in title signals freshness
  const currentYear = new Date().getFullYear();
  if (title.includes(String(currentYear)) || title.includes(String(currentYear + 1))) {
    clickabilityScore += 3;
  }

  // --- Readability Score (0–15) ---
  let readabilityScore = 10;
  // Penalise all-caps
  if (title === title.toUpperCase() && title.length > 3) {
    readabilityScore -= 5;
    issues.push('Title is all uppercase — use title case instead.');
  }
  // Penalise excessive punctuation
  const punctCount = (title.match(/[!?:;,]/g) || []).length;
  if (punctCount > 3) {
    readabilityScore -= 3;
    issues.push('Excessive punctuation in title.');
  }
  // Penalise very long words
  const longWords = words.filter((w) => w.length > 15);
  if (longWords.length > 0) {
    readabilityScore -= 2;
  }
  readabilityScore = Math.max(0, readabilityScore);

  const overall = Math.min(
    100,
    Math.max(0, lengthScore + powerWordScore + emotionalScore + clickabilityScore + readabilityScore),
  );

  return {
    overall,
    lengthScore,
    powerWordScore,
    emotionalScore,
    clickabilityScore,
    readabilityScore,
    powerWordsFound,
    emotionalWordsFound,
    issues,
    suggestions,
  };
}

/* ========================================================================== */
/*  SECTION 8 — Excerpt Generation                                            */
/* ========================================================================== */

/** Generate a clean plain-text excerpt from HTML content. */
export function generateExcerpt(
  content: string,
  maxLength: number = 300,
): string {
  const text = stripHtml(content);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/* ========================================================================== */
/*  SECTION 9 — Text Similarity (Jaccard)                                     */
/* ========================================================================== */

/**
 * Compute Jaccard similarity between two texts (0–1).
 * Useful for detecting near-duplicate titles/descriptions.
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/* ========================================================================== */
/*  SECTION 10 — N-Gram Analysis                                              */
/* ========================================================================== */

/** Generate n-grams from text. */
export function generateNgrams(
  text: string,
  n: number = 2,
): Map<string, number> {
  const words = tokenize(stripHtml(text)).filter((w) => !STOP_WORDS.has(w));
  const ngrams = new Map<string, number>();

  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(' ');
    ngrams.set(gram, (ngrams.get(gram) ?? 0) + 1);
  }

  return ngrams;
}

/** Get top n-grams sorted by frequency. */
export function getTopNgrams(
  text: string,
  n: number = 2,
  limit: number = 10,
): { gram: string; count: number }[] {
  const ngrams = generateNgrams(text, n);
  return Array.from(ngrams.entries())
    .map(([gram, count]) => ({ gram, count }))
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ========================================================================== */
/*  INTERNAL HELPERS                                                          */
/* ========================================================================== */

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
