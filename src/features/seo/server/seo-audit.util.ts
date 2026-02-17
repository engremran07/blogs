/**
 * ============================================================================
 * MODULE  : seo/seo-audit.util.ts
 * PURPOSE : Pure audit check functions — 21 checks across severity tiers
 * PATTERN : Framework-agnostic, zero side-effects, deterministic
 * ============================================================================
 */

import type {
  AuditableContent,
  AuditCheck,
  AuditResult,
  AuditSeverity,
  AuditStatus,
  SeoTargetType,
} from '../types';
import {
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  META_DESCRIPTION_MIN_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  CONTENT_MIN_WORD_COUNT,
  CONTENT_GOOD_WORD_COUNT,
  CONTENT_EXCELLENT_WORD_COUNT,
  KEYWORD_DENSITY_MIN,
  KEYWORD_DENSITY_MAX,
  MAX_KEYWORD_STUFFING_DENSITY,
  SLUG_MAX_LENGTH,
  SLUG_MAX_WORDS,
  HEADING_MAX_H1,
  HEADING_MIN_H2,
  IMAGE_ALT_MAX_LENGTH,
  INTERNAL_LINKS_MIN,
  EXTERNAL_LINKS_MIN,
  CONTENT_STALE_MONTHS,
  AUDIT_WEIGHTS,
  CHECK_NAMES,
} from './constants';
import { stripHtml, countWords } from '@/shared/text.util';
export { stripHtml, countWords } from '@/shared/text.util';

/* ========================================================================== */
/*  SECTION 1 — HTML Parsing Helpers                                          */
/* ========================================================================== */

export function extractHeadings(
  html: string,
): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      text: stripHtml(match[2]),
    });
  }
  return headings;
}

export function extractImages(
  html: string,
): { src: string; alt?: string; title?: string }[] {
  const images: { src: string; alt?: string; title?: string }[] = [];
  const regex = /<img\s[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = /src=["']([^"']+)["']/i.exec(tag);
    const altMatch = /alt=["']([^"']*)["']/i.exec(tag);
    const titleMatch = /title=["']([^"']*)["']/i.exec(tag);
    if (srcMatch) {
      images.push({
        src: srcMatch[1],
        alt: altMatch?.[1],
        title: titleMatch?.[1],
      });
    }
  }
  return images;
}

export function extractLinks(html: string): { href: string; text: string }[] {
  const links: { href: string; text: string }[] = [];
  const regex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    links.push({ href: match[1], text: stripHtml(match[2]) });
  }
  return links;
}

function buildCheck(
  name: string,
  status: AuditStatus,
  severity: AuditSeverity,
  message: string,
  recommendation?: string,
  details?: Record<string, unknown>,
): AuditCheck {
  const maxScore = AUDIT_WEIGHTS[severity];
  let score: number;
  if (status === 'pass') score = maxScore;
  else if (status === 'warn') score = Math.round(maxScore * 0.5);
  else if (status === 'fail') score = 0;
  else score = maxScore; // info
  return { name, status, severity, message, recommendation, score, maxScore, details };
}

/* ========================================================================== */
/*  SECTION 2 — Individual Audit Check Functions                              */
/* ========================================================================== */

export function checkTitleLength(content: AuditableContent): AuditCheck {
  const title = content.seoTitle || content.title;
  const len = title.length;

  if (len >= TITLE_MIN_LENGTH && len <= TITLE_MAX_LENGTH) {
    return buildCheck(
      CHECK_NAMES.TITLE_LENGTH,
      'pass',
      'CRITICAL',
      `Title is ${len} characters — within optimal range (${TITLE_MIN_LENGTH}–${TITLE_MAX_LENGTH}).`,
    );
  }
  if (len < TITLE_MIN_LENGTH) {
    return buildCheck(
      CHECK_NAMES.TITLE_LENGTH,
      'fail',
      'CRITICAL',
      `Title is only ${len} characters — too short.`,
      `Aim for ${TITLE_MIN_LENGTH}–${TITLE_MAX_LENGTH} characters for optimal SERP display.`,
      { length: len, min: TITLE_MIN_LENGTH, max: TITLE_MAX_LENGTH },
    );
  }
  return buildCheck(
    CHECK_NAMES.TITLE_LENGTH,
    'warn',
    'CRITICAL',
    `Title is ${len} characters — may be truncated in SERPs.`,
    `Shorten to ${TITLE_MAX_LENGTH} characters or fewer.`,
    { length: len, min: TITLE_MIN_LENGTH, max: TITLE_MAX_LENGTH },
  );
}

export function checkMetaDescription(content: AuditableContent): AuditCheck {
  const desc = content.seoDescription;
  if (!desc) {
    return buildCheck(
      CHECK_NAMES.META_DESCRIPTION,
      'fail',
      'CRITICAL',
      'No meta description set.',
      'Write a compelling meta description between 120–160 characters that includes your focus keyword.',
    );
  }
  const len = desc.length;
  if (len >= META_DESCRIPTION_MIN_LENGTH && len <= META_DESCRIPTION_MAX_LENGTH) {
    return buildCheck(
      CHECK_NAMES.META_DESCRIPTION,
      'pass',
      'CRITICAL',
      `Meta description is ${len} characters — optimal length.`,
    );
  }
  if (len < META_DESCRIPTION_MIN_LENGTH) {
    return buildCheck(
      CHECK_NAMES.META_DESCRIPTION,
      'warn',
      'CRITICAL',
      `Meta description is only ${len} characters — rather short.`,
      `Expand to at least ${META_DESCRIPTION_MIN_LENGTH} characters for better SERP presence.`,
      { length: len },
    );
  }
  return buildCheck(
    CHECK_NAMES.META_DESCRIPTION,
    'warn',
    'CRITICAL',
    `Meta description is ${len} characters — may be truncated.`,
    `Keep under ${META_DESCRIPTION_MAX_LENGTH} characters.`,
    { length: len },
  );
}

export function checkUrlStructure(content: AuditableContent): AuditCheck {
  const { slug } = content;
  const issues: string[] = [];

  if (!slug) {
    return buildCheck(
      CHECK_NAMES.URL_STRUCTURE,
      'fail',
      'CRITICAL',
      'No slug defined.',
      'Set a URL-friendly slug using lowercase letters, numbers, and hyphens.',
    );
  }

  if (slug.length > SLUG_MAX_LENGTH) issues.push(`Slug exceeds ${SLUG_MAX_LENGTH} chars (${slug.length}).`);
  if (/[A-Z]/.test(slug)) issues.push('Slug contains uppercase letters.');
  if (/[_\s]/.test(slug)) issues.push('Slug contains underscores or spaces — use hyphens instead.');
  if (/--/.test(slug)) issues.push('Slug contains consecutive hyphens.');
  if (/[^a-z0-9-]/.test(slug)) issues.push('Slug contains non-alphanumeric characters.');
  const wordCount = slug.split('-').filter(Boolean).length;
  if (wordCount > SLUG_MAX_WORDS) issues.push(`Slug has ${wordCount} words — aim for ${SLUG_MAX_WORDS} or fewer.`);
  if (/^\d/.test(slug)) issues.push('Slug starts with a number — prefer descriptive words.');

  if (issues.length === 0) {
    return buildCheck(CHECK_NAMES.URL_STRUCTURE, 'pass', 'CRITICAL', 'URL structure is clean and SEO-friendly.');
  }
  return buildCheck(
    CHECK_NAMES.URL_STRUCTURE,
    issues.length >= 3 ? 'fail' : 'warn',
    'CRITICAL',
    `URL structure issues: ${issues.join(' ')}`,
    'Use short, descriptive, lowercase slugs with hyphens.',
    { issues, slug },
  );
}

export function checkContentLength(content: AuditableContent): AuditCheck {
  const wc = content.wordCount ?? countWords(content.content);

  if (wc >= CONTENT_EXCELLENT_WORD_COUNT) {
    return buildCheck(
      CHECK_NAMES.CONTENT_LENGTH,
      'pass',
      'CRITICAL',
      `Content has ${wc} words — excellent depth for SEO.`,
      undefined,
      { wordCount: wc },
    );
  }
  if (wc >= CONTENT_GOOD_WORD_COUNT) {
    return buildCheck(
      CHECK_NAMES.CONTENT_LENGTH,
      'pass',
      'CRITICAL',
      `Content has ${wc} words — good length.`,
      `Consider expanding to ${CONTENT_EXCELLENT_WORD_COUNT}+ words for competitive topics.`,
      { wordCount: wc },
    );
  }
  if (wc >= CONTENT_MIN_WORD_COUNT) {
    return buildCheck(
      CHECK_NAMES.CONTENT_LENGTH,
      'warn',
      'CRITICAL',
      `Content has ${wc} words — acceptable but thin.`,
      `Expand to at least ${CONTENT_GOOD_WORD_COUNT} words for better rankings.`,
      { wordCount: wc },
    );
  }
  return buildCheck(
    CHECK_NAMES.CONTENT_LENGTH,
    'fail',
    'CRITICAL',
    `Content has only ${wc} words — too thin for SEO.`,
    `Write at least ${CONTENT_MIN_WORD_COUNT} words. Aim for ${CONTENT_GOOD_WORD_COUNT}+.`,
    { wordCount: wc },
  );
}

export function checkFocusKeywords(content: AuditableContent): AuditCheck {
  const keywords = content.seoKeywords;
  if (!keywords || keywords.length === 0) {
    return buildCheck(
      CHECK_NAMES.FOCUS_KEYWORDS,
      'fail',
      'IMPORTANT',
      'No focus keywords defined.',
      'Add 2–5 focus keywords that describe your content.',
    );
  }
  const title = (content.seoTitle || content.title).toLowerCase();
  const desc = (content.seoDescription || '').toLowerCase();
  const bodyText = stripHtml(content.content).toLowerCase();

  const found: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (title.includes(kwLower) || bodyText.includes(kwLower)) {
      found.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const inTitle = keywords.some((kw) => title.includes(kw.toLowerCase()));
  const inDesc = keywords.some((kw) => desc.includes(kw.toLowerCase()));

  if (found.length === keywords.length && inTitle && inDesc) {
    return buildCheck(
      CHECK_NAMES.FOCUS_KEYWORDS,
      'pass',
      'IMPORTANT',
      'All focus keywords appear in title, description, and content.',
      undefined,
      { found, inTitle, inDesc },
    );
  }

  const messages: string[] = [];
  if (missing.length > 0) messages.push(`Keywords not in content: ${missing.join(', ')}.`);
  if (!inTitle) messages.push('No focus keyword in the title.');
  if (!inDesc) messages.push('No focus keyword in the meta description.');

  return buildCheck(
    CHECK_NAMES.FOCUS_KEYWORDS,
    missing.length > 0 ? 'fail' : 'warn',
    'IMPORTANT',
    messages.join(' '),
    'Include your primary keyword in the title, meta description, first paragraph, and throughout the content.',
    { found, missing, inTitle, inDesc },
  );
}

export function checkKeywordDensity(content: AuditableContent): AuditCheck {
  const keywords = content.seoKeywords;
  if (!keywords || keywords.length === 0) {
    return buildCheck(
      CHECK_NAMES.KEYWORD_DENSITY,
      'info',
      'IMPORTANT',
      'No keywords to measure density.',
      'Add focus keywords first.',
    );
  }

  const bodyText = stripHtml(content.content).toLowerCase();
  const totalWords = countWords(content.content);
  if (totalWords === 0) {
    return buildCheck(CHECK_NAMES.KEYWORD_DENSITY, 'fail', 'IMPORTANT', 'No content to analyse.');
  }

  const densities: Record<string, number> = {};
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    const regex = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = bodyText.match(regex);
    const count = matches ? matches.length : 0;
    densities[kw] = (count / totalWords) * 100;
  }

  const overStuffed = Object.entries(densities).filter(
    ([, d]) => d > KEYWORD_DENSITY_MAX,
  );
  const tooLow = Object.entries(densities).filter(
    ([, d]) => d < KEYWORD_DENSITY_MIN && d > 0,
  );
  const absent = Object.entries(densities).filter(([, d]) => d === 0);

  if (overStuffed.length > 0) {
    return buildCheck(
      CHECK_NAMES.KEYWORD_DENSITY,
      'warn',
      'IMPORTANT',
      `Keyword stuffing risk: ${overStuffed.map(([k, d]) => `"${k}" at ${d.toFixed(1)}%`).join(', ')}.`,
      `Keep keyword density between ${KEYWORD_DENSITY_MIN}%–${KEYWORD_DENSITY_MAX}%.`,
      { densities },
    );
  }

  if (absent.length === keywords.length) {
    return buildCheck(
      CHECK_NAMES.KEYWORD_DENSITY,
      'fail',
      'IMPORTANT',
      'None of the focus keywords appear in the content.',
      'Naturally incorporate your focus keywords into the content.',
      { densities },
    );
  }

  if (tooLow.length > 0) {
    return buildCheck(
      CHECK_NAMES.KEYWORD_DENSITY,
      'warn',
      'IMPORTANT',
      `Low keyword density for: ${tooLow.map(([k, d]) => `"${k}" at ${d.toFixed(1)}%`).join(', ')}.`,
      `Aim for ${KEYWORD_DENSITY_MIN}%–${KEYWORD_DENSITY_MAX}% density.`,
      { densities },
    );
  }

  return buildCheck(
    CHECK_NAMES.KEYWORD_DENSITY,
    'pass',
    'IMPORTANT',
    'Keyword density is within optimal range.',
    undefined,
    { densities },
  );
}

export function checkHeadingStructure(content: AuditableContent): AuditCheck {
  const headings = content.headings ?? extractHeadings(content.content);
  const issues: string[] = [];

  const h1Count = headings.filter((h) => h.level === 1).length;
  const h2Count = headings.filter((h) => h.level === 2).length;

  if (h1Count === 0) issues.push('No H1 tag found.');
  else if (h1Count > HEADING_MAX_H1) issues.push(`Multiple H1 tags (${h1Count}) — use only one.`);

  if (h2Count < HEADING_MIN_H2) issues.push('No H2 subheadings — break content into sections.');

  // Check for skipped heading levels
  const levels = [...new Set(headings.map((h) => h.level))].sort();
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      issues.push(`Heading level skipped: H${levels[i - 1]} → H${levels[i]}.`);
    }
  }

  // Check empty headings
  const empty = headings.filter((h) => !h.text.trim());
  if (empty.length > 0) issues.push(`${empty.length} empty heading(s) found.`);

  if (issues.length === 0) {
    return buildCheck(
      CHECK_NAMES.HEADING_STRUCTURE,
      'pass',
      'IMPORTANT',
      `Heading structure is well-organized (${headings.length} headings).`,
      undefined,
      { headings: headings.length, h1Count, h2Count },
    );
  }
  return buildCheck(
    CHECK_NAMES.HEADING_STRUCTURE,
    h1Count === 0 ? 'fail' : 'warn',
    'IMPORTANT',
    issues.join(' '),
    'Use a single H1 for the main title, H2 for sections, H3 for subsections. Don\'t skip levels.',
    { headings: headings.length, h1Count, h2Count, issues },
  );
}

export function checkImagesAndAltText(content: AuditableContent): AuditCheck {
  const images = content.images ?? extractImages(content.content);

  if (images.length === 0) {
    const wc = content.wordCount ?? countWords(content.content);
    if (wc > 300) {
      return buildCheck(
        CHECK_NAMES.IMAGE_ALT_TEXT,
        'warn',
        'IMPORTANT',
        'No images in content — visual elements improve engagement and SEO.',
        'Add relevant images with descriptive alt text.',
      );
    }
    return buildCheck(
      CHECK_NAMES.IMAGE_ALT_TEXT,
      'info',
      'IMPORTANT',
      'No images in content.',
    );
  }

  const missingAlt = images.filter((img) => !img.alt || !img.alt.trim());
  const longAlt = images.filter(
    (img) => img.alt && img.alt.length > IMAGE_ALT_MAX_LENGTH,
  );

  if (missingAlt.length === 0 && longAlt.length === 0) {
    return buildCheck(
      CHECK_NAMES.IMAGE_ALT_TEXT,
      'pass',
      'IMPORTANT',
      `All ${images.length} image(s) have proper alt text.`,
      undefined,
      { totalImages: images.length },
    );
  }

  const messages: string[] = [];
  if (missingAlt.length > 0) messages.push(`${missingAlt.length} image(s) missing alt text.`);
  if (longAlt.length > 0) messages.push(`${longAlt.length} image(s) have alt text exceeding ${IMAGE_ALT_MAX_LENGTH} chars.`);

  return buildCheck(
    CHECK_NAMES.IMAGE_ALT_TEXT,
    missingAlt.length > images.length / 2 ? 'fail' : 'warn',
    'IMPORTANT',
    messages.join(' '),
    'Every image should have descriptive, concise alt text (under 125 characters).',
    { totalImages: images.length, missingAlt: missingAlt.length, longAlt: longAlt.length },
  );
}

export function checkInternalLinks(content: AuditableContent): AuditCheck {
  const internal =
    content.internalLinks ??
    extractLinks(content.content)
      .filter((l) => l.href.startsWith('/') || l.href.startsWith('#'))
      .map((l) => ({ targetId: l.href, anchor: l.text }));

  if (internal.length >= INTERNAL_LINKS_MIN) {
    return buildCheck(
      CHECK_NAMES.INTERNAL_LINKS,
      'pass',
      'IMPORTANT',
      `${internal.length} internal link(s) found — good for site structure.`,
      undefined,
      { count: internal.length },
    );
  }

  return buildCheck(
    CHECK_NAMES.INTERNAL_LINKS,
    internal.length === 0 ? 'fail' : 'warn',
    'IMPORTANT',
    `Only ${internal.length} internal link(s) — needs improvement.`,
    `Add at least ${INTERNAL_LINKS_MIN} internal links to related content.`,
    { count: internal.length },
  );
}

export function checkExternalLinks(content: AuditableContent): AuditCheck {
  const allLinks = extractLinks(content.content);
  const external = allLinks.filter(
    (l) => /^https?:\/\//i.test(l.href) && !l.href.startsWith('/'),
  );

  // Check for nofollow on external links (white-hat: not all need nofollow)
  if (external.length === 0) {
    return buildCheck(
      CHECK_NAMES.EXTERNAL_LINKS,
      'warn',
      'OPTIONAL',
      'No external links — citing authoritative sources can improve topical authority.',
      `Add at least ${EXTERNAL_LINKS_MIN} link(s) to reputable external resources.`,
      { count: 0 },
    );
  }

  return buildCheck(
    CHECK_NAMES.EXTERNAL_LINKS,
    'pass',
    'OPTIONAL',
    `${external.length} external link(s) found — citing sources builds credibility.`,
    undefined,
    { count: external.length },
  );
}

export function checkOpenGraph(content: AuditableContent): AuditCheck {
  const issues: string[] = [];

  if (!content.ogTitle && !content.seoTitle) issues.push('No OG title.');
  if (!content.ogDescription && !content.seoDescription) issues.push('No OG description.');
  if (!content.ogImage && !content.featuredImage) issues.push('No OG image.');

  if (issues.length === 0) {
    return buildCheck(
      CHECK_NAMES.OPEN_GRAPH,
      'pass',
      'OPTIONAL',
      'Open Graph meta tags are complete.',
    );
  }
  return buildCheck(
    CHECK_NAMES.OPEN_GRAPH,
    issues.length >= 2 ? 'fail' : 'warn',
    'OPTIONAL',
    `Open Graph issues: ${issues.join(' ')}`,
    'Set og:title, og:description, and og:image for social sharing previews.',
    { issues },
  );
}

export function checkTwitterCard(content: AuditableContent): AuditCheck {
  if (content.twitterCard) {
    return buildCheck(
      CHECK_NAMES.TWITTER_CARD,
      'pass',
      'OPTIONAL',
      'Twitter Card meta is configured.',
    );
  }
  return buildCheck(
    CHECK_NAMES.TWITTER_CARD,
    'warn',
    'OPTIONAL',
    'No Twitter Card meta set.',
    'Add twitter:card, twitter:title, twitter:description, and twitter:image.',
  );
}

export function checkReadingTime(content: AuditableContent): AuditCheck {
  const wc = content.wordCount ?? countWords(content.content);
  const rt = content.readingTime ?? Math.ceil(wc / 238);

  if (rt <= 0) {
    return buildCheck(
      CHECK_NAMES.READING_TIME,
      'info',
      'OPTIONAL',
      'Reading time could not be calculated.',
    );
  }

  if (rt >= 3 && rt <= 15) {
    return buildCheck(
      CHECK_NAMES.READING_TIME,
      'pass',
      'OPTIONAL',
      `Estimated reading time: ${rt} min — ideal for engagement.`,
      undefined,
      { readingTime: rt, wordCount: wc },
    );
  }

  if (rt < 3) {
    return buildCheck(
      CHECK_NAMES.READING_TIME,
      'warn',
      'OPTIONAL',
      `Reading time is only ${rt} min — content may be too brief.`,
      'Consider expanding your content for better depth.',
      { readingTime: rt, wordCount: wc },
    );
  }

  return buildCheck(
    CHECK_NAMES.READING_TIME,
    'info',
    'OPTIONAL',
    `Reading time is ${rt} min — consider adding a table of contents.`,
    undefined,
    { readingTime: rt, wordCount: wc },
  );
}

export function checkCategories(content: AuditableContent): AuditCheck {
  const cats = content.categories;
  if (!cats || cats.length === 0) {
    return buildCheck(
      CHECK_NAMES.CATEGORIES,
      'warn',
      'OPTIONAL',
      'No categories assigned.',
      'Assign at least one category for better content organization and internal linking.',
    );
  }
  if (cats.length > 5) {
    return buildCheck(
      CHECK_NAMES.CATEGORIES,
      'warn',
      'OPTIONAL',
      `${cats.length} categories assigned — too many dilutes topical focus.`,
      'Keep categories to 1–3 per post.',
      { count: cats.length },
    );
  }
  return buildCheck(
    CHECK_NAMES.CATEGORIES,
    'pass',
    'OPTIONAL',
    `${cats.length} categor${cats.length === 1 ? 'y' : 'ies'} assigned.`,
    undefined,
    { count: cats.length, names: cats.map((c) => c.name) },
  );
}

export function checkTags(content: AuditableContent): AuditCheck {
  const tags = content.tags;
  if (!tags || tags.length === 0) {
    return buildCheck(
      CHECK_NAMES.TAGS,
      'warn',
      'OPTIONAL',
      'No tags assigned.',
      'Add 3–8 relevant tags for discoverability.',
    );
  }
  if (tags.length > 15) {
    return buildCheck(
      CHECK_NAMES.TAGS,
      'warn',
      'OPTIONAL',
      `${tags.length} tags — too many can be seen as spam.`,
      'Limit to 5–10 relevant tags.',
      { count: tags.length },
    );
  }
  return buildCheck(
    CHECK_NAMES.TAGS,
    'pass',
    'OPTIONAL',
    `${tags.length} tag(s) assigned.`,
    undefined,
    { count: tags.length, names: tags.map((t) => t.name) },
  );
}

export function checkPublishDate(content: AuditableContent): AuditCheck {
  const pubDate = content.publishedAt;
  if (!pubDate) {
    return buildCheck(
      CHECK_NAMES.PUBLISH_DATE,
      'warn',
      'OPTIONAL',
      'No publish date set.',
      'Set a publish date — search engines use it for freshness signals.',
    );
  }

  const published = new Date(pubDate);
  const now = new Date();
  const monthsAgo = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const updated = content.updatedAt ? new Date(content.updatedAt) : null;
  const updatedMonthsAgo = updated
    ? (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : monthsAgo;

  if (updatedMonthsAgo > CONTENT_STALE_MONTHS) {
    return buildCheck(
      CHECK_NAMES.PUBLISH_DATE,
      'warn',
      'OPTIONAL',
      `Content was last updated ${Math.round(updatedMonthsAgo)} months ago — may be considered stale.`,
      'Review and update older content periodically to maintain freshness signals.',
      { publishedMonthsAgo: Math.round(monthsAgo), updatedMonthsAgo: Math.round(updatedMonthsAgo) },
    );
  }

  return buildCheck(
    CHECK_NAMES.PUBLISH_DATE,
    'pass',
    'OPTIONAL',
    `Content freshness is good — last updated ${Math.round(updatedMonthsAgo)} month(s) ago.`,
    undefined,
    { publishedMonthsAgo: Math.round(monthsAgo), updatedMonthsAgo: Math.round(updatedMonthsAgo) },
  );
}

export function checkCanonicalUrl(content: AuditableContent): AuditCheck {
  if (content.canonicalUrl) {
    if (!/^(https?:\/\/|\/)/i.test(content.canonicalUrl)) {
      return buildCheck(
        CHECK_NAMES.CANONICAL_URL,
        'warn',
        'IMPORTANT',
        'Canonical URL format is invalid — must be absolute or start with /.',
        'Use a fully-qualified URL (e.g., https://example.com/page).',
        { canonicalUrl: content.canonicalUrl },
      );
    }
    return buildCheck(
      CHECK_NAMES.CANONICAL_URL,
      'pass',
      'IMPORTANT',
      'Canonical URL is set.',
      undefined,
      { canonicalUrl: content.canonicalUrl },
    );
  }
  return buildCheck(
    CHECK_NAMES.CANONICAL_URL,
    'warn',
    'IMPORTANT',
    'No canonical URL set — may cause duplicate content issues.',
    'Set a canonical URL to indicate the preferred version of this page.',
  );
}

export function checkStructuredData(content: AuditableContent): AuditCheck {
  if (content.structuredData && Object.keys(content.structuredData).length > 0) {
    const type = content.structuredData['@type'];
    return buildCheck(
      CHECK_NAMES.STRUCTURED_DATA,
      'pass',
      'OPTIONAL',
      `Structured data present${type ? ` (${type})` : ''} — enables rich snippets.`,
      undefined,
      { type },
    );
  }
  return buildCheck(
    CHECK_NAMES.STRUCTURED_DATA,
    'warn',
    'OPTIONAL',
    'No structured data (JSON-LD) found.',
    'Add Schema.org structured data for rich snippet eligibility (Article, BreadcrumbList, FAQ, etc.).',
  );
}

export function checkKeywordStuffing(content: AuditableContent): AuditCheck {
  const keywords = content.seoKeywords;
  if (!keywords || keywords.length === 0) {
    return buildCheck(
      CHECK_NAMES.KEYWORD_STUFFING,
      'pass',
      'IMPORTANT',
      'No keywords to check for stuffing.',
    );
  }

  const bodyText = stripHtml(content.content).toLowerCase();
  const totalWords = countWords(content.content);
  if (totalWords === 0) {
    return buildCheck(CHECK_NAMES.KEYWORD_STUFFING, 'pass', 'IMPORTANT', 'No content to analyse.');
  }

  const stuffed: string[] = [];
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    const regex = new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = bodyText.match(regex);
    const count = matches ? matches.length : 0;
    const density = (count / totalWords) * 100;
    if (density > MAX_KEYWORD_STUFFING_DENSITY) {
      stuffed.push(`"${kw}" (${density.toFixed(1)}%)`);
    }
  }

  if (stuffed.length > 0) {
    return buildCheck(
      CHECK_NAMES.KEYWORD_STUFFING,
      'fail',
      'IMPORTANT',
      `Keyword stuffing detected: ${stuffed.join(', ')}.`,
      `Keep keyword density below ${MAX_KEYWORD_STUFFING_DENSITY}%. Use synonyms and natural language variations.`,
      { stuffed },
    );
  }

  return buildCheck(
    CHECK_NAMES.KEYWORD_STUFFING,
    'pass',
    'IMPORTANT',
    'No keyword stuffing detected — content reads naturally.',
  );
}

export function checkContentUniqueness(content: AuditableContent): AuditCheck {
  // Heuristic: check for common duplicate patterns (boilerplate, repeated paragraphs)
  const text = stripHtml(content.content);
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 50);

  if (paragraphs.length === 0) {
    return buildCheck(
      CHECK_NAMES.CONTENT_UNIQUENESS,
      'info',
      'OPTIONAL',
      'Not enough content to check for uniqueness.',
    );
  }

  const seen = new Map<string, number>();
  let duplicates = 0;
  for (const p of paragraphs) {
    const normalized = p.toLowerCase().replace(/\s+/g, ' ');
    const count = seen.get(normalized) ?? 0;
    if (count > 0) duplicates++;
    seen.set(normalized, count + 1);
  }

  if (duplicates > 0) {
    return buildCheck(
      CHECK_NAMES.CONTENT_UNIQUENESS,
      'warn',
      'OPTIONAL',
      `${duplicates} duplicated paragraph(s) detected within the content.`,
      'Remove or rewrite repeated paragraphs to ensure unique, valuable content.',
      { duplicates, totalParagraphs: paragraphs.length },
    );
  }

  return buildCheck(
    CHECK_NAMES.CONTENT_UNIQUENESS,
    'pass',
    'OPTIONAL',
    'No duplicate paragraphs detected — content appears unique.',
    undefined,
    { totalParagraphs: paragraphs.length },
  );
}

export function checkMobileFriendliness(content: AuditableContent): AuditCheck {
  const html = content.content;
  const issues: string[] = [];

  // Check for fixed-width tables
  if (/<table[^>]*width\s*=\s*["']\d+/i.test(html)) {
    issues.push('Fixed-width tables may cause horizontal scrolling on mobile.');
  }

  // Check for overly large images without responsive attributes
  const imgs = extractImages(html);
  const nonResponsive = imgs.filter((img) => {
    const tag = html.substring(
      html.indexOf(img.src) - 100,
      html.indexOf(img.src) + img.src.length + 200,
    );
    return /width\s*=\s*["']\d{4,}/i.test(tag);
  });
  if (nonResponsive.length > 0) {
    issues.push(`${nonResponsive.length} image(s) have large fixed dimensions.`);
  }

  // Check viewport-hostile patterns
  if (/<iframe[^>]*(?:width\s*=\s*["']\d{4,})/i.test(html)) {
    issues.push('Iframe with large fixed width may break mobile layout.');
  }

  if (issues.length === 0) {
    return buildCheck(
      CHECK_NAMES.MOBILE_FRIENDLINESS,
      'pass',
      'OPTIONAL',
      'No obvious mobile-unfriendly patterns detected in content HTML.',
    );
  }

  return buildCheck(
    CHECK_NAMES.MOBILE_FRIENDLINESS,
    'warn',
    'OPTIONAL',
    `Mobile-friendliness concerns: ${issues.join(' ')}`,
    'Use responsive images, fluid tables, and avoid fixed widths.',
    { issues },
  );
}

/* ========================================================================== */
/*  SECTION 3 — Full Audit Orchestrator                                       */
/* ========================================================================== */

/** Run all 21 audit checks against a single content item. */
export function auditContent(
  content: AuditableContent,
  targetType: SeoTargetType = 'POST',
): AuditResult {
  const checks: AuditCheck[] = [
    // Critical tier
    checkTitleLength(content),
    checkMetaDescription(content),
    checkUrlStructure(content),
    checkContentLength(content),
    // Important tier
    checkFocusKeywords(content),
    checkKeywordDensity(content),
    checkHeadingStructure(content),
    checkImagesAndAltText(content),
    checkInternalLinks(content),
    checkCanonicalUrl(content),
    checkKeywordStuffing(content),
    // Optional tier
    checkExternalLinks(content),
    checkOpenGraph(content),
    checkTwitterCard(content),
    checkReadingTime(content),
    checkCategories(content),
    checkTags(content),
    checkPublishDate(content),
    checkStructuredData(content),
    checkContentUniqueness(content),
    checkMobileFriendliness(content),
  ];

  const totalMaxScore = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const overallScore =
    totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  const recommendations = generateRecommendations(checks);

  return {
    targetType,
    targetId: content.id,
    overallScore,
    checks,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

/** Generate prioritised recommendation strings from failed/warned checks. */
export function generateRecommendations(checks: AuditCheck[]): string[] {
  const severityOrder: Record<AuditSeverity, number> = {
    CRITICAL: 0,
    IMPORTANT: 1,
    OPTIONAL: 2,
    INFO: 3,
  };

  return checks
    .filter((c) => (c.status === 'fail' || c.status === 'warn') && c.recommendation)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .map((c) => `[${c.severity}] ${c.name}: ${c.recommendation!}`);
}

/* ========================================================================== */
/*  SECTION 4 — Site-Wide Audit Aggregator                                    */
/* ========================================================================== */

/** Aggregate individual audit results into a site-level overview. */
export function aggregateSiteAudit(
  results: AuditResult[],
): Omit<import('../types').SiteAuditResult, 'globalIssues'> & {
  globalIssues: AuditCheck[];
} {
  const totalContent = results.length;
  const scoreSum = results.reduce((s, r) => s + r.overallScore, 0);
  const averageScore = totalContent > 0 ? Math.round(scoreSum / totalContent) : 0;

  // Identify issues that appear in >50% of posts
  const issueFrequency = new Map<string, { check: AuditCheck; count: number }>();
  for (const result of results) {
    for (const check of result.checks) {
      if (check.status === 'fail' || check.status === 'warn') {
        const existing = issueFrequency.get(check.name);
        if (existing) {
          existing.count++;
        } else {
          issueFrequency.set(check.name, { check, count: 1 });
        }
      }
    }
  }

  const globalIssues: AuditCheck[] = [];
  for (const [, { check, count }] of issueFrequency) {
    if (totalContent > 0 && count / totalContent > 0.5) {
      globalIssues.push({
        ...check,
        message: `Affects ${count}/${totalContent} items (${Math.round((count / totalContent) * 100)}%): ${check.message}`,
      });
    }
  }

  return {
    overallScore: averageScore,
    totalContent,
    averageScore,
    globalIssues,
    perContentResults: results,
    timestamp: new Date().toISOString(),
  };
}
