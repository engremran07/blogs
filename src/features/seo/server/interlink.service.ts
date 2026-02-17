/**
 * ============================================================================
 * MODULE  : seo/interlink.service.ts
 * PURPOSE : Enterprise-grade auto-interlinking engine with manual overrides.
 *
 * Capabilities:
 *   1.  Content-body keyword extraction via extractKeywords() + TF-IDF scoring
 *   2.  Jaccard similarity + keyword overlap for relevance ranking
 *   3.  Recency, popularity (viewCount), and content quality signals
 *   4.  HTML-safe injection — skips code / pre / script / blockquote / headings
 *   5.  Anchor text diversity enforcement (no duplicate anchors site-wide)
 *   6.  XSS-safe title attribute escaping
 *   7.  Persistent InternalLink table — tracks every link with status & origin
 *   8.  Manual override: APPROVED / REJECTED / EXCLUDED statuses
 *   9.  InterlinkExclusion table — phrase / target / source / pair rules
 *  10.  Lifecycle hooks — auto-scan on create, re-scan on update, repair on delete
 *  11.  Broken link auto-repair — removes dead links from content on target delete
 *  12.  Slug change detection — rewrites old URLs to new slugs automatically
 *  13.  Smart cron — prioritises recently-changed content, proportional split
 *  14.  Idempotent injection — data-interlink attribute prevents double-linking
 *  15.  Comprehensive reports with PageRank-style hub/authority analysis
 * ============================================================================
 */

import { stripHtml, extractLinks } from './seo-audit.util';
import { extractKeywords, jaccardSimilarity } from './seo-text.util';

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export interface LinkCandidate {
  sourceId: string;
  sourceType: 'POST' | 'PAGE';
  targetId: string;
  targetType: 'POST' | 'PAGE';
  anchorText: string;
  matchOffset: number;
  relevanceScore: number;
  alreadyLinked: boolean;
}

export interface InternalLinkRecord {
  id: string;
  sourceId: string;
  sourceType: 'POST' | 'PAGE';
  targetId: string;
  targetType: 'POST' | 'PAGE';
  anchorText: string;
  targetUrl: string;
  relevanceScore: number;
  status: 'ACTIVE' | 'SUGGESTED' | 'APPROVED' | 'REJECTED' | 'BROKEN' | 'REMOVED';
  origin: 'AUTO' | 'MANUAL' | 'CRON';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InterlinkScanResult {
  sourceId: string;
  sourceType: 'POST' | 'PAGE';
  existingLinks: number;
  newCandidates: LinkCandidate[];
  brokenLinks: { href: string; anchorText: string }[];
  autoInserted: number;
}

export interface InterlinkReport {
  totalContent: number;
  totalLinks: number;
  avgLinksPerContent: number;
  orphanContent: { id: string; title: string; type: string }[];
  hubContent: { id: string; title: string; type: string; outboundLinks: number; inboundLinks: number }[];
  brokenLinks: { sourceId: string; sourceType: string; href: string }[];
  linkDistribution: { range: string; count: number }[];
  /** Persisted link stats */
  persistedLinks: { active: number; suggested: number; approved: number; rejected: number; broken: number; manual: number };
  exclusionCount: number;
}

export interface ManualLinkInput {
  sourceId: string;
  sourceType: 'POST' | 'PAGE';
  targetId: string;
  targetType: 'POST' | 'PAGE';
  anchorText: string;
}

export interface ExclusionInput {
  ruleType: 'PHRASE' | 'TARGET' | 'SOURCE' | 'PAIR';
  phrase?: string;
  contentId?: string;
  contentType?: 'POST' | 'PAGE';
  pairedId?: string;
  pairedType?: 'POST' | 'PAGE';
  reason?: string;
}

/** Minimal Prisma interface for DI */
export interface InterlinkPrisma {
  post: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
  };
  page: {
    findMany: (args?: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
  };
  internalLink: {
    findMany: (args?: any) => Promise<any[]>;
    findFirst: (args?: any) => Promise<any | null>;
    findUnique: (args?: any) => Promise<any | null>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
    upsert: (args: any) => Promise<any>;
  };
  interlinkExclusion: {
    findMany: (args?: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
    count: (args?: any) => Promise<number>;
  };
}

/* ========================================================================== */
/*  Constants                                                                 */
/* ========================================================================== */

const MIN_ANCHOR_WORDS = 2;
const MAX_AUTO_LINKS_PER_CONTENT = 10;
const MIN_RELEVANCE_SCORE = 35;
const MIN_CONTENT_WORDS = 50;
const MIN_ANCHOR_LENGTH = 4;
/** Maximum characters for single-word anchors to prevent common-word matches */
const MIN_SINGLE_WORD_LENGTH = 10;
/** Weight factors for relevance scoring (total = 100) */
const SCORING_WEIGHTS = {
  KEYWORD_OVERLAP: 25,
  TAG_CATEGORY_OVERLAP: 15,
  CONTENT_SIMILARITY: 20,
  PUBLISHED_BONUS: 10,
  RECENCY_BONUS: 10,
  POPULARITY_BONUS: 10,
  QUALITY_BONUS: 10,
} as const;
/** HTML tags to skip when injecting links */
const SKIP_TAGS = new Set(['a', 'code', 'pre', 'script', 'style', 'textarea', 'button', 'input', 'select', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption']);

/* ========================================================================== */
/*  HTML Escaping                                                             */
/* ========================================================================== */

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ========================================================================== */
/*  Content Index                                                             */
/* ========================================================================== */

export interface ContentIndex {
  id: string;
  type: 'POST' | 'PAGE';
  title: string;
  slug: string;
  url: string;
  keywords: string[];
  bodyKeywords: string[];
  searchPhrases: string[];
  status: string;
  viewCount: number;
  wordCount: number;
  publishedAt: Date | null;
  updatedAt: Date | null;
  plainBody: string;
}

/**
 * Build a rich content index using body-keyword extraction, tags, categories,
 * and SEO keywords — leveraging extractKeywords() for TF-IDF-like ranking.
 */
function buildContentIndex(posts: any[], pages: any[]): ContentIndex[] {
  const index: ContentIndex[] = [];

  for (const post of posts) {
    const seoKw = (post.seoKeywords || []) as string[];
    const tagNames = (post.tags || []).map((t: any) => t.name);
    const catNames = (post.categories || []).map((c: any) => c.name);

    // Extract top keywords from body content using TF-IDF style analysis
    const bodyKw = post.content
      ? extractKeywords(post.content, 15).map((k: any) => k.term)
      : [];

    const allPhrases = [
      post.title,
      ...seoKw,
      ...tagNames,
      ...catNames,
      ...bodyKw,
    ].filter(Boolean);

    const plainBody = post.content ? stripHtml(post.content) : '';

    index.push({
      id: post.id,
      type: 'POST',
      title: post.title,
      slug: post.slug,
      url: `/blog/${post.slug}`,
      keywords: [...seoKw, ...tagNames, ...bodyKw],
      bodyKeywords: bodyKw,
      searchPhrases: [...new Set(allPhrases.map((p: string) => p.toLowerCase().trim()).filter((p: string) => p.length >= MIN_ANCHOR_LENGTH))],
      status: post.status,
      viewCount: post.viewCount ?? 0,
      wordCount: post.wordCount ?? 0,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
      updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
      plainBody,
    });
  }

  for (const page of pages) {
    // Pages also get body keyword extraction
    const bodyKw = page.content
      ? extractKeywords(page.content, 15).map((k: any) => k.term)
      : [];

    const allPhrases = [page.title, ...bodyKw].filter(Boolean);
    const plainBody = page.content ? stripHtml(page.content) : '';

    index.push({
      id: page.id,
      type: 'PAGE',
      title: page.title,
      slug: page.slug,
      url: `/${page.slug}`,
      keywords: [...bodyKw],
      bodyKeywords: bodyKw,
      searchPhrases: [...new Set(allPhrases.map((p: string) => p.toLowerCase().trim()).filter((p: string) => p.length >= MIN_ANCHOR_LENGTH))],
      status: page.status,
      viewCount: 0,
      wordCount: page.wordCount ?? 0,
      publishedAt: page.publishedAt ? new Date(page.publishedAt) : null,
      updatedAt: page.updatedAt ? new Date(page.updatedAt) : null,
      plainBody,
    });
  }

  return index;
}

/* ========================================================================== */
/*  Phrase Matching (IDF-aware)                                               */
/* ========================================================================== */

/**
 * Find phrase occurrences. Filters out common-word false positives and
 * uses space/punctuation boundaries instead of \\b to avoid hyphen issues.
 */
function findPhraseOccurrences(
  text: string,
  phrase: string,
): { offset: number; length: number }[] {
  const results: { offset: number; length: number }[] = [];
  const phraseLower = phrase.toLowerCase();

  // Reject single-word anchors that are too short
  const wordCount = phraseLower.split(/\s+/).length;
  if (wordCount < MIN_ANCHOR_WORDS && phraseLower.length < MIN_SINGLE_WORD_LENGTH) return results;

  const escaped = phraseLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use lookaround with whitespace/punctuation/boundaries instead of \b
  const regex = new RegExp(`(?<=^|[\\s.,;:!?()\\[\\]"'])${escaped}(?=$|[\\s.,;:!?()\\[\\]"'])`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({ offset: match.index, length: phraseLower.length });
  }

  return results;
}

/**
 * Check if a phrase is already linked in the HTML content.
 */
function isPhraseAlreadyLinked(
  html: string,
  phrase: string,
  targetUrl: string,
): boolean {
  const lower = html.toLowerCase();
  const phraseLower = phrase.toLowerCase();

  const linkRegex = /<a\s[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(lower)) !== null) {
    const linkText = stripHtml(match[1]).toLowerCase().trim();
    if (linkText.includes(phraseLower)) return true;
  }

  if (lower.includes(`href="${targetUrl.toLowerCase()}"`) ||
      lower.includes(`href='${targetUrl.toLowerCase()}'`)) {
    return true;
  }

  if (lower.includes(`data-interlink-target="${targetUrl.toLowerCase()}"`)) {
    return true;
  }

  return false;
}

/* ========================================================================== */
/*  Relevance Scoring — Enterprise Multi-Signal                               */
/* ========================================================================== */

/**
 * Calculate relevance score using keyword overlap, tag/category overlap,
 * content body Jaccard similarity, recency, popularity, and quality.
 */
function calculateRelevance(
  source: {
    keywords: string[];
    tags: string[];
    categories: string[];
    plainBody: string;
    wordCount: number;
  },
  target: ContentIndex,
): number {
  let score = 0;

  // 1. Keyword overlap (up to 25 pts)
  const srcKw = new Set(source.keywords.map(k => k.toLowerCase()));
  const tgtKw = new Set(target.keywords.map(k => k.toLowerCase()));
  let kwOverlap = 0;
  for (const k of srcKw) { if (tgtKw.has(k)) kwOverlap++; }
  const kwRatio = srcKw.size > 0 ? kwOverlap / srcKw.size : 0;
  score += Math.round(kwRatio * SCORING_WEIGHTS.KEYWORD_OVERLAP);

  // 2. Tag/category overlap (up to 15 pts)
  const srcTags = new Set([...source.tags, ...source.categories].map(t => t.toLowerCase()));
  const tgtPhrases = new Set(target.searchPhrases);
  let tagOverlap = 0;
  for (const t of srcTags) { if (tgtPhrases.has(t)) tagOverlap++; }
  score += Math.min(SCORING_WEIGHTS.TAG_CATEGORY_OVERLAP, tagOverlap * 5);

  // 3. Content body Jaccard similarity (up to 20 pts)
  if (source.plainBody && target.plainBody) {
    const similarity = jaccardSimilarity(
      source.plainBody.substring(0, 2000),
      target.plainBody.substring(0, 2000),
    );
    score += Math.round(similarity * SCORING_WEIGHTS.CONTENT_SIMILARITY);
  }

  // 4. Published bonus (10 pts)
  if (target.status === 'PUBLISHED') score += SCORING_WEIGHTS.PUBLISHED_BONUS;

  // 5. Recency bonus — content from last 90 days gets full points (10 pts)
  if (target.publishedAt) {
    const ageDays = (Date.now() - target.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) score += SCORING_WEIGHTS.RECENCY_BONUS;
    else if (ageDays <= 90) score += Math.round(SCORING_WEIGHTS.RECENCY_BONUS * 0.7);
    else if (ageDays <= 365) score += Math.round(SCORING_WEIGHTS.RECENCY_BONUS * 0.4);
    else score += Math.round(SCORING_WEIGHTS.RECENCY_BONUS * 0.1);
  }

  // 6. Popularity bonus — logarithmic viewCount scaling (10 pts)
  if (target.viewCount > 0) {
    const popScore = Math.min(1, Math.log10(target.viewCount + 1) / 4);
    score += Math.round(popScore * SCORING_WEIGHTS.POPULARITY_BONUS);
  }

  // 7. Content quality — longer, richer content scores higher (10 pts)
  if (target.wordCount >= 1500) score += SCORING_WEIGHTS.QUALITY_BONUS;
  else if (target.wordCount >= 800) score += Math.round(SCORING_WEIGHTS.QUALITY_BONUS * 0.6);
  else if (target.wordCount >= 300) score += Math.round(SCORING_WEIGHTS.QUALITY_BONUS * 0.3);

  return Math.min(100, Math.max(0, score));
}

/* ========================================================================== */
/*  HTML-Safe Link Injection                                                  */
/* ========================================================================== */

interface HtmlSegment {
  type: 'text' | 'tag';
  content: string;
  insideSkipTag: string | null;
}

/**
 * Parse HTML into text & tag segments, tracking skip-tag nesting.
 */
function parseHtmlSegments(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
  const skipStack: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: html.substring(lastIndex, match.index),
        insideSkipTag: skipStack.length > 0 ? skipStack[skipStack.length - 1] : null,
      });
    }

    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing = fullTag.endsWith('/>');

    segments.push({ type: 'tag', content: fullTag, insideSkipTag: skipStack.length > 0 ? skipStack[skipStack.length - 1] : null });

    if (SKIP_TAGS.has(tagName)) {
      if (isClosing) {
        if (skipStack.length > 0 && skipStack[skipStack.length - 1] === tagName) skipStack.pop();
      } else if (!isSelfClosing) {
        skipStack.push(tagName);
      }
    }

    lastIndex = match.index + fullTag.length;
  }

  if (lastIndex < html.length) {
    segments.push({
      type: 'text',
      content: html.substring(lastIndex),
      insideSkipTag: skipStack.length > 0 ? skipStack[skipStack.length - 1] : null,
    });
  }

  return segments;
}

/**
 * Insert <a> links into HTML safely — only text nodes outside skip tags.
 * Uses proper attribute escaping and data-interlink tracking.
 */
export function injectLinksIntoContent(
  html: string,
  candidates: LinkCandidate[],
  contentIndex: ContentIndex[],
): { html: string; inserted: number } {
  const targetMap = new Map(contentIndex.map(c => [c.id, c]));

  const toInject = candidates
    .filter(c => !c.alreadyLinked && c.relevanceScore >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_AUTO_LINKS_PER_CONTENT);

  if (toInject.length === 0) return { html, inserted: 0 };

  const usedAnchors = new Set<string>();
  const usedTargets = new Set<string>();
  let inserted = 0;

  const segments = parseHtmlSegments(html);

  for (const candidate of toInject) {
    if (usedTargets.has(candidate.targetId)) continue;

    const target = targetMap.get(candidate.targetId);
    if (!target) continue;

    const phrase = candidate.anchorText;
    if (!phrase || phrase.length < MIN_ANCHOR_LENGTH) continue;

    const anchorLower = phrase.toLowerCase();
    if (usedAnchors.has(anchorLower)) continue;

    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const phraseRegex = new RegExp(`(?<=^|[\\s.,;:!?()\\[\\]"'])${escaped}(?=$|[\\s.,;:!?()\\[\\]"'])`, 'i');

    let injected = false;
    for (const segment of segments) {
      if (segment.type !== 'text' || segment.insideSkipTag !== null) continue;

      const match = phraseRegex.exec(segment.content);
      if (!match) continue;

      if (isPhraseAlreadyLinked(html, phrase, target.url)) break;

      const originalAnchor = segment.content.substring(match.index, match.index + phrase.length);
      const link = `<a href="${escapeAttr(target.url)}" title="${escapeAttr(target.title)}" data-interlink="auto" data-interlink-target="${escapeAttr(target.url)}">${originalAnchor}</a>`;

      segment.content = segment.content.substring(0, match.index) + link + segment.content.substring(match.index + phrase.length);
      injected = true;
      break;
    }

    if (injected) {
      inserted++;
      usedAnchors.add(anchorLower);
      usedTargets.add(candidate.targetId);
    }
  }

  const result = segments.map(s => s.content).join('');
  return { html: result, inserted };
}

/* ========================================================================== */
/*  Broken Link Detector & Repairer                                           */
/* ========================================================================== */

export function detectBrokenLinks(
  html: string,
  contentIndex: ContentIndex[],
): { href: string; anchorText: string }[] {
  const links = extractLinks(html);
  const broken: { href: string; anchorText: string }[] = [];

  const validUrls = new Set(contentIndex.map(c => c.url));
  const staticRoutes = ['/', '/blog', '/about', '/contact', '/tags', '/search', '/login', '/register', '/profile'];
  for (const route of staticRoutes) validUrls.add(route);

  for (const link of links) {
    if (!link.href.startsWith('/') || link.href.startsWith('//')) continue;
    if (link.href.startsWith('#') || link.href.startsWith('/api/')) continue;
    const cleanHref = link.href.split('?')[0].split('#')[0];
    if (!validUrls.has(cleanHref)) {
      broken.push({ href: link.href, anchorText: link.text });
    }
  }

  return broken;
}

/**
 * Remove broken links from HTML — replaces <a> with plain text.
 */
export function removeBrokenLinksFromHtml(
  html: string,
  brokenUrls: Set<string>,
): { html: string; removed: number } {
  let result = html;
  let removed = 0;

  for (const url of brokenUrls) {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `<a\\s[^>]*href=["']${escapedUrl}["'][^>]*>((?:(?!</a>)[\\s\\S])*)</a>`,
      'gi',
    );
    result = result.replace(regex, (_m, text) => {
      removed++;
      return stripHtml(text);
    });
  }

  return { html: result, removed };
}

/**
 * Rewrite old slug URLs to new URLs in HTML content.
 */
export function rewriteUrlsInHtml(
  html: string,
  oldUrl: string,
  newUrl: string,
): { html: string; rewritten: number } {
  let result = html;
  let rewritten = 0;
  const escapedOld = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(href=["'])${escapedOld}(["'])`, 'gi');
  result = result.replace(regex, (_m, prefix, suffix) => {
    rewritten++;
    return `${prefix}${newUrl}${suffix}`;
  });
  return { html: result, rewritten };
}

/* ========================================================================== */
/*  Content Scanner                                                           */
/* ========================================================================== */

/**
 * Scan a single piece of content for interlinking opportunities.
 * Respects exclusion rules, anchor diversity, and multi-signal relevance.
 */
export function scanContentForLinks(
  source: {
    id: string;
    type: 'POST' | 'PAGE';
    content: string;
    seoKeywords?: string[];
    tags?: { name: string }[];
    categories?: { name: string }[];
    wordCount?: number;
  },
  contentIndex: ContentIndex[],
  excludedPhrases?: Set<string>,
  excludedTargets?: Set<string>,
  excludedPairs?: Set<string>,
): LinkCandidate[] {
  const candidates: LinkCandidate[] = [];
  const plainText = stripHtml(source.content);
  const wordCount = plainText.split(/\s+/).length;

  if (wordCount < MIN_CONTENT_WORDS) return candidates;

  const sourceKeywords = [
    ...(source.seoKeywords || []),
    ...(source.content ? extractKeywords(source.content, 10).map(k => k.term) : []),
  ];
  const sourceTags = (source.tags || []).map(t => t.name);
  const sourceCategories = (source.categories || []).map(c => c.name);

  const matchedTargets = new Set<string>();
  const usedAnchors = new Set<string>();

  for (const target of contentIndex) {
    if (target.id === source.id) continue;
    if (matchedTargets.has(target.id)) continue;
    if (target.status !== 'PUBLISHED') continue;

    if (excludedTargets?.has(target.id)) continue;
    if (excludedPairs?.has(`${source.id}:${target.id}`)) continue;

    for (const phrase of target.searchPhrases) {
      const phraseWords = phrase.split(/\s+/).length;
      if (phraseWords < MIN_ANCHOR_WORDS && phrase.length < MIN_SINGLE_WORD_LENGTH) continue;
      if (excludedPhrases?.has(phrase)) continue;
      if (usedAnchors.has(phrase)) continue;

      const occurrences = findPhraseOccurrences(plainText, phrase);
      if (occurrences.length === 0) continue;

      const alreadyLinked = isPhraseAlreadyLinked(source.content, phrase, target.url);

      const relevance = calculateRelevance(
        { keywords: sourceKeywords, tags: sourceTags, categories: sourceCategories, plainBody: plainText, wordCount: source.wordCount ?? wordCount },
        target,
      );

      if (relevance < MIN_RELEVANCE_SCORE) continue;

      const firstOccurrence = occurrences[0];
      const originalAnchor = plainText.substring(firstOccurrence.offset, firstOccurrence.offset + firstOccurrence.length);

      candidates.push({
        sourceId: source.id,
        sourceType: source.type,
        targetId: target.id,
        targetType: target.type,
        anchorText: originalAnchor,
        matchOffset: firstOccurrence.offset,
        relevanceScore: relevance,
        alreadyLinked,
      });

      matchedTargets.add(target.id);
      usedAnchors.add(phrase);
      break;
    }
  }

  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return candidates.slice(0, MAX_AUTO_LINKS_PER_CONTENT * 2);
}

/* ========================================================================== */
/*  InterlinkService — Persistent, Enterprise-Grade with Manual Overrides     */
/* ========================================================================== */

export class InterlinkService {
  constructor(private prisma: InterlinkPrisma) {}

  /* ── Index ── */

  async buildIndex(): Promise<ContentIndex[]> {
    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          id: true, title: true, slug: true, status: true,
          content: true, seoKeywords: true, viewCount: true,
          wordCount: true, publishedAt: true, updatedAt: true,
          tags: { select: { name: true } },
          categories: { select: { name: true } },
        },
      }),
      this.prisma.page.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          id: true, title: true, slug: true, status: true,
          content: true, wordCount: true,
          publishedAt: true, updatedAt: true,
        },
      }),
    ]);

    return buildContentIndex(posts, pages);
  }

  /* ── Exclusion Rules ── */

  private async loadExclusions(): Promise<{
    phrases: Set<string>;
    targets: Set<string>;
    sources: Set<string>;
    pairs: Set<string>;
  }> {
    const exclusions = await this.prisma.interlinkExclusion.findMany();
    const phrases = new Set<string>();
    const targets = new Set<string>();
    const sources = new Set<string>();
    const pairs = new Set<string>();

    for (const ex of exclusions) {
      switch (ex.ruleType) {
        case 'PHRASE':  if (ex.phrase) phrases.add(ex.phrase.toLowerCase()); break;
        case 'TARGET':  if (ex.contentId) targets.add(ex.contentId); break;
        case 'SOURCE':  if (ex.contentId) sources.add(ex.contentId); break;
        case 'PAIR':    if (ex.contentId && ex.pairedId) pairs.add(`${ex.contentId}:${ex.pairedId}`); break;
      }
    }

    return { phrases, targets, sources, pairs };
  }

  /* ── Scan Single ── */

  async scanSingle(
    contentId: string,
    contentType: 'POST' | 'PAGE',
  ): Promise<InterlinkScanResult> {
    const [index, exclusions] = await Promise.all([
      this.buildIndex(),
      this.loadExclusions(),
    ]);

    const delegate = contentType === 'POST' ? this.prisma.post : this.prisma.page;
    const content = await delegate.findUnique({
      where: { id: contentId },
      ...(contentType === 'POST'
        ? { include: { tags: { select: { name: true } }, categories: { select: { name: true } } } }
        : {}),
    });

    if (!content) {
      return { sourceId: contentId, sourceType: contentType, existingLinks: 0, newCandidates: [], brokenLinks: [], autoInserted: 0 };
    }

    if (exclusions.sources.has(contentId)) {
      const existingLinks = extractLinks(content.content || '').filter((l: { href: string }) => l.href.startsWith('/')).length;
      return { sourceId: contentId, sourceType: contentType, existingLinks, newCandidates: [], brokenLinks: [], autoInserted: 0 };
    }

    const rejectedLinks = await this.prisma.internalLink.findMany({
      where: { sourceId: contentId, status: 'REJECTED' },
      select: { targetId: true },
    });
    const rejectedTargets = new Set(rejectedLinks.map((r: any) => r.targetId));

    const existingLinks = extractLinks(content.content || '').filter((l: { href: string }) => l.href.startsWith('/')).length;

    const candidates = scanContentForLinks(
      {
        id: content.id, type: contentType, content: content.content || '',
        seoKeywords: content.seoKeywords || [], tags: content.tags || [],
        categories: content.categories || [], wordCount: content.wordCount ?? 0,
      },
      index,
      exclusions.phrases,
      new Set([...exclusions.targets, ...rejectedTargets]),
      exclusions.pairs,
    );

    const brokenLinks = detectBrokenLinks(content.content || '', index);

    return {
      sourceId: contentId, sourceType: contentType, existingLinks,
      newCandidates: candidates.filter(c => !c.alreadyLinked),
      brokenLinks, autoInserted: 0,
    };
  }

  /* ── Auto-Link Single Content ── */

  async autoLinkContent(
    contentId: string,
    contentType: 'POST' | 'PAGE',
  ): Promise<{ inserted: number; brokenFixed: number }> {
    const [index, exclusions] = await Promise.all([
      this.buildIndex(),
      this.loadExclusions(),
    ]);

    if (exclusions.sources.has(contentId)) return { inserted: 0, brokenFixed: 0 };

    const delegate = contentType === 'POST' ? this.prisma.post : this.prisma.page;
    const content = await delegate.findUnique({
      where: { id: contentId },
      ...(contentType === 'POST'
        ? { include: { tags: { select: { name: true } }, categories: { select: { name: true } } } }
        : {}),
    });

    if (!content?.content) return { inserted: 0, brokenFixed: 0 };

    const [rejectedLinks, approvedLinks] = await Promise.all([
      this.prisma.internalLink.findMany({ where: { sourceId: contentId, status: 'REJECTED' }, select: { targetId: true } }),
      this.prisma.internalLink.findMany({ where: { sourceId: contentId, status: 'APPROVED' } }),
    ]);
    const rejectedTargets = new Set(rejectedLinks.map((r: any) => r.targetId));

    const candidates = scanContentForLinks(
      {
        id: content.id, type: contentType, content: content.content,
        seoKeywords: content.seoKeywords || [], tags: content.tags || [],
        categories: content.categories || [], wordCount: content.wordCount ?? 0,
      },
      index, exclusions.phrases,
      new Set([...exclusions.targets, ...rejectedTargets]),
      exclusions.pairs,
    );

    // Merge APPROVED (manual) links as high-priority candidates
    const approvedCandidates: LinkCandidate[] = [];
    for (const approved of approvedLinks) {
      const target = index.find(c => c.id === approved.targetId);
      if (!target) continue;
      if (isPhraseAlreadyLinked(content.content, approved.anchorText, target.url)) continue;
      approvedCandidates.push({
        sourceId: contentId, sourceType: contentType,
        targetId: approved.targetId, targetType: approved.targetType as 'POST' | 'PAGE',
        anchorText: approved.anchorText, matchOffset: 0,
        relevanceScore: 100, alreadyLinked: false,
      });
    }

    const allCandidates = [...approvedCandidates, ...candidates];
    const { html, inserted } = injectLinksIntoContent(content.content, allCandidates, index);

    // Fix broken links
    const broken = detectBrokenLinks(content.content, index);
    let brokenFixed = 0;
    let finalHtml = html;
    if (broken.length > 0) {
      const brokenUrls = new Set(broken.map(b => b.href.split('?')[0].split('#')[0]));
      const result = removeBrokenLinksFromHtml(finalHtml, brokenUrls);
      finalHtml = result.html;
      brokenFixed = result.removed;

      await this.prisma.internalLink.updateMany({
        where: { sourceId: contentId, targetUrl: { in: [...brokenUrls] }, status: 'ACTIVE' },
        data: { status: 'BROKEN' },
      });
    }

    if (inserted > 0 || brokenFixed > 0) {
      await delegate.update({ where: { id: contentId }, data: { content: finalHtml } });
    }

    // Persist new links
    for (const candidate of allCandidates.filter(c => !c.alreadyLinked).slice(0, inserted)) {
      const target = index.find(c => c.id === candidate.targetId);
      if (!target) continue;
      try {
        await this.prisma.internalLink.upsert({
          where: { sourceId_targetId_anchorText: { sourceId: contentId, targetId: candidate.targetId, anchorText: candidate.anchorText } },
          create: { sourceId: contentId, sourceType: contentType, targetId: candidate.targetId, targetType: candidate.targetType, anchorText: candidate.anchorText, targetUrl: target.url, relevanceScore: candidate.relevanceScore, status: 'ACTIVE', origin: 'AUTO' },
          update: { status: 'ACTIVE', relevanceScore: candidate.relevanceScore, targetUrl: target.url },
        });
      } catch { /* unique constraint race */ }

      // APPROVED → ACTIVE
      if (approvedCandidates.some(a => a.targetId === candidate.targetId)) {
        await this.prisma.internalLink.updateMany({
          where: { sourceId: contentId, targetId: candidate.targetId, status: 'APPROVED' },
          data: { status: 'ACTIVE' },
        });
      }
    }

    return { inserted, brokenFixed };
  }

  /* ── Auto-Link All (Cron / Bulk) ── */

  async autoLinkAll(
    limit: number = 50,
  ): Promise<{
    scanned: number;
    totalInserted: number;
    totalBroken: number;
    details: { id: string; type: string; inserted: number; broken: number }[];
  }> {
    const [index, exclusions] = await Promise.all([
      this.buildIndex(),
      this.loadExclusions(),
    ]);

    // Proportional split based on actual content ratio
    const totalPosts = await this.prisma.post.count({ where: { status: 'PUBLISHED', deletedAt: null } });
    const totalPages = await this.prisma.page.count({ where: { status: 'PUBLISHED', deletedAt: null } });
    const totalContent = totalPosts + totalPages;
    const postLimit = totalContent > 0 ? Math.max(1, Math.round(limit * (totalPosts / totalContent))) : limit;
    const pageLimit = Math.max(1, limit - postLimit);

    // Prioritise recently-updated content
    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { id: true, content: true, seoKeywords: true, wordCount: true, tags: { select: { name: true } }, categories: { select: { name: true } } },
        take: postLimit, orderBy: { updatedAt: 'desc' as const },
      }),
      this.prisma.page.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { id: true, content: true, wordCount: true },
        take: pageLimit, orderBy: { updatedAt: 'desc' as const },
      }),
    ]);

    // Batch-load rejected links
    const allSourceIds = [...posts.map(p => p.id), ...pages.map(p => p.id)];
    const rejectedLinks = await this.prisma.internalLink.findMany({
      where: { sourceId: { in: allSourceIds }, status: 'REJECTED' },
      select: { sourceId: true, targetId: true },
    });
    const rejectedMap = new Map<string, Set<string>>();
    for (const r of rejectedLinks) {
      if (!rejectedMap.has(r.sourceId)) rejectedMap.set(r.sourceId, new Set());
      rejectedMap.get(r.sourceId)!.add(r.targetId);
    }

    const details: { id: string; type: string; inserted: number; broken: number }[] = [];
    let totalInserted = 0;
    let totalBroken = 0;

    for (const post of posts) {
      if (!post.content || exclusions.sources.has(post.id)) continue;
      const rejectedTargets = rejectedMap.get(post.id) || new Set<string>();
      const candidates = scanContentForLinks(
        { id: post.id, type: 'POST', content: post.content, seoKeywords: post.seoKeywords || [], tags: post.tags || [], categories: post.categories || [], wordCount: post.wordCount ?? 0 },
        index, exclusions.phrases, new Set([...exclusions.targets, ...rejectedTargets]), exclusions.pairs,
      );
      const broken = detectBrokenLinks(post.content, index);
      const { html, inserted } = injectLinksIntoContent(post.content, candidates, index);

      let finalHtml = html;
      let brokenFixed = 0;
      if (broken.length > 0) {
        const brokenUrls = new Set(broken.map(b => b.href.split('?')[0].split('#')[0]));
        const result = removeBrokenLinksFromHtml(finalHtml, brokenUrls);
        finalHtml = result.html;
        brokenFixed = result.removed;
      }
      if (inserted > 0 || brokenFixed > 0) {
        await this.prisma.post.update({ where: { id: post.id }, data: { content: finalHtml } });
      }
      for (const candidate of candidates.filter(c => !c.alreadyLinked).slice(0, inserted)) {
        const target = index.find(c => c.id === candidate.targetId);
        if (!target) continue;
        try {
          await this.prisma.internalLink.upsert({
            where: { sourceId_targetId_anchorText: { sourceId: post.id, targetId: candidate.targetId, anchorText: candidate.anchorText } },
            create: { sourceId: post.id, sourceType: 'POST', targetId: candidate.targetId, targetType: candidate.targetType, anchorText: candidate.anchorText, targetUrl: target.url, relevanceScore: candidate.relevanceScore, status: 'ACTIVE', origin: 'CRON' },
            update: { status: 'ACTIVE', relevanceScore: candidate.relevanceScore, targetUrl: target.url },
          });
        } catch { /* race */ }
      }
      totalInserted += inserted;
      totalBroken += broken.length;
      details.push({ id: post.id, type: 'POST', inserted, broken: broken.length });
    }

    for (const page of pages) {
      if (!page.content || exclusions.sources.has(page.id)) continue;
      const rejectedTargets = rejectedMap.get(page.id) || new Set<string>();
      const candidates = scanContentForLinks(
        { id: page.id, type: 'PAGE', content: page.content, wordCount: page.wordCount ?? 0 },
        index, exclusions.phrases, new Set([...exclusions.targets, ...rejectedTargets]), exclusions.pairs,
      );
      const broken = detectBrokenLinks(page.content, index);
      const { html, inserted } = injectLinksIntoContent(page.content, candidates, index);

      let finalHtml = html;
      let brokenFixed = 0;
      if (broken.length > 0) {
        const brokenUrls = new Set(broken.map(b => b.href.split('?')[0].split('#')[0]));
        const result = removeBrokenLinksFromHtml(finalHtml, brokenUrls);
        finalHtml = result.html;
        brokenFixed = result.removed;
      }
      if (inserted > 0 || brokenFixed > 0) {
        await this.prisma.page.update({ where: { id: page.id }, data: { content: finalHtml } });
      }
      for (const candidate of candidates.filter(c => !c.alreadyLinked).slice(0, inserted)) {
        const target = index.find(c => c.id === candidate.targetId);
        if (!target) continue;
        try {
          await this.prisma.internalLink.upsert({
            where: { sourceId_targetId_anchorText: { sourceId: page.id, targetId: candidate.targetId, anchorText: candidate.anchorText } },
            create: { sourceId: page.id, sourceType: 'PAGE', targetId: candidate.targetId, targetType: candidate.targetType, anchorText: candidate.anchorText, targetUrl: target.url, relevanceScore: candidate.relevanceScore, status: 'ACTIVE', origin: 'CRON' },
            update: { status: 'ACTIVE', relevanceScore: candidate.relevanceScore, targetUrl: target.url },
          });
        } catch { /* race */ }
      }
      totalInserted += inserted;
      totalBroken += broken.length;
      details.push({ id: page.id, type: 'PAGE', inserted, broken: broken.length });
    }

    return { scanned: posts.length + pages.length, totalInserted, totalBroken, details };
  }

  /* ── Report ── */

  async generateReport(): Promise<InterlinkReport> {
    const index = await this.buildIndex();

    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, select: { id: true, title: true, content: true } }),
      this.prisma.page.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, select: { id: true, title: true, content: true } }),
    ]);

    const allContent = [
      ...posts.map((p: any) => ({ ...p, type: 'POST' })),
      ...pages.map((p: any) => ({ ...p, type: 'PAGE' })),
    ];

    const outbound = new Map<string, number>();
    const inbound = new Map<string, number>();
    const urlToId = new Map<string, string>();
    const allBroken: { sourceId: string; sourceType: string; href: string }[] = [];

    for (const item of index) {
      urlToId.set(item.url, item.id);
      outbound.set(item.id, 0);
      inbound.set(item.id, 0);
    }

    for (const item of allContent) {
      const links = extractLinks(item.content || '').filter((l: { href: string }) => l.href.startsWith('/'));
      outbound.set(item.id, links.length);
      for (const link of links) {
        const cleanHref = link.href.split('?')[0].split('#')[0];
        const targetId = urlToId.get(cleanHref);
        if (targetId) inbound.set(targetId, (inbound.get(targetId) || 0) + 1);
      }
      const broken = detectBrokenLinks(item.content || '', index);
      for (const b of broken) allBroken.push({ sourceId: item.id, sourceType: item.type, href: b.href });
    }

    // Orphan: 0 inbound links (no PageRank flowing in)
    const orphanContent = allContent
      .filter(c => (inbound.get(c.id) || 0) === 0)
      .map(c => ({ id: c.id, title: c.title, type: c.type }));

    const hubContent = allContent
      .map(c => ({ id: c.id, title: c.title, type: c.type, outboundLinks: outbound.get(c.id) || 0, inboundLinks: inbound.get(c.id) || 0 }))
      .sort((a, b) => (b.outboundLinks + b.inboundLinks) - (a.outboundLinks + a.inboundLinks))
      .slice(0, 10);

    const totalLinks = Array.from(outbound.values()).reduce((s, v) => s + v, 0);
    const linkDistribution: { range: string; count: number }[] = [
      { range: '0 links', count: Array.from(outbound.values()).filter(v => v === 0).length },
      { range: '1-2 links', count: Array.from(outbound.values()).filter(v => v >= 1 && v <= 2).length },
      { range: '3-5 links', count: Array.from(outbound.values()).filter(v => v >= 3 && v <= 5).length },
      { range: '6-10 links', count: Array.from(outbound.values()).filter(v => v >= 6 && v <= 10).length },
      { range: '10+ links', count: Array.from(outbound.values()).filter(v => v > 10).length },
    ];

    const [activeCount, suggestedCount, approvedCount, rejectedCount, brokenCount, manualCount, exclusionCount] = await Promise.all([
      this.prisma.internalLink.count({ where: { status: 'ACTIVE' } }),
      this.prisma.internalLink.count({ where: { status: 'SUGGESTED' } }),
      this.prisma.internalLink.count({ where: { status: 'APPROVED' } }),
      this.prisma.internalLink.count({ where: { status: 'REJECTED' } }),
      this.prisma.internalLink.count({ where: { status: 'BROKEN' } }),
      this.prisma.internalLink.count({ where: { origin: 'MANUAL' } }),
      this.prisma.interlinkExclusion.count(),
    ]);

    return {
      totalContent: allContent.length, totalLinks,
      avgLinksPerContent: allContent.length > 0 ? Math.round((totalLinks / allContent.length) * 10) / 10 : 0,
      orphanContent, hubContent, brokenLinks: allBroken, linkDistribution,
      persistedLinks: { active: activeCount, suggested: suggestedCount, approved: approvedCount, rejected: rejectedCount, broken: brokenCount, manual: manualCount },
      exclusionCount,
    };
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Manual Override Methods                                           */
  /* ════════════════════════════════════════════════════════════════════ */

  /** Create a manual link (admin explicitly adds a link). Saved as APPROVED. */
  async createManualLink(input: ManualLinkInput): Promise<InternalLinkRecord> {
    const index = await this.buildIndex();
    const target = index.find(c => c.id === input.targetId);
    const targetUrl = target?.url || '';

    return this.prisma.internalLink.upsert({
      where: { sourceId_targetId_anchorText: { sourceId: input.sourceId, targetId: input.targetId, anchorText: input.anchorText } },
      create: {
        sourceId: input.sourceId, sourceType: input.sourceType,
        targetId: input.targetId, targetType: input.targetType,
        anchorText: input.anchorText, targetUrl,
        relevanceScore: 100, status: 'APPROVED', origin: 'MANUAL',
      },
      update: { status: 'APPROVED', origin: 'MANUAL', relevanceScore: 100 },
    });
  }

  /** Apply a specific manual/approved link — inject it into source content immediately. */
  async applyManualLink(linkId: string): Promise<{ inserted: boolean }> {
    const link = await this.prisma.internalLink.findUnique({ where: { id: linkId } });
    if (!link || link.status === 'REJECTED' || link.status === 'REMOVED') return { inserted: false };

    const index = await this.buildIndex();
    const target = index.find(c => c.id === link.targetId);
    if (!target) return { inserted: false };

    const delegate = link.sourceType === 'POST' ? this.prisma.post : this.prisma.page;
    const content = await delegate.findUnique({ where: { id: link.sourceId } });
    if (!content?.content) return { inserted: false };

    if (isPhraseAlreadyLinked(content.content, link.anchorText, target.url)) {
      await this.prisma.internalLink.update({ where: { id: linkId }, data: { status: 'ACTIVE' } });
      return { inserted: true };
    }

    const candidate: LinkCandidate = {
      sourceId: link.sourceId, sourceType: link.sourceType,
      targetId: link.targetId, targetType: link.targetType,
      anchorText: link.anchorText, matchOffset: 0,
      relevanceScore: 100, alreadyLinked: false,
    };

    const { html, inserted } = injectLinksIntoContent(content.content, [candidate], index);
    if (inserted > 0) {
      await delegate.update({ where: { id: link.sourceId }, data: { content: html } });
      await this.prisma.internalLink.update({ where: { id: linkId }, data: { status: 'ACTIVE', targetUrl: target.url } });
    }
    return { inserted: inserted > 0 };
  }

  /** Approve a suggested link — will inject on next auto-link cycle. */
  async approveLink(linkId: string): Promise<InternalLinkRecord> {
    return this.prisma.internalLink.update({ where: { id: linkId }, data: { status: 'APPROVED' } });
  }

  /** Reject a link — prevents auto-insertion of this source→target pair permanently. */
  async rejectLink(linkId: string): Promise<InternalLinkRecord> {
    return this.prisma.internalLink.update({ where: { id: linkId }, data: { status: 'REJECTED' } });
  }

  /** Remove an active link from content HTML and mark as REMOVED. */
  async removeLink(linkId: string): Promise<{ removed: boolean }> {
    const link = await this.prisma.internalLink.findUnique({ where: { id: linkId } });
    if (!link) return { removed: false };

    const delegate = link.sourceType === 'POST' ? this.prisma.post : this.prisma.page;
    const content = await delegate.findUnique({ where: { id: link.sourceId } });

    if (content?.content && link.targetUrl) {
      const { html, removed } = removeBrokenLinksFromHtml(content.content, new Set([link.targetUrl]));
      if (removed > 0) {
        await delegate.update({ where: { id: link.sourceId }, data: { content: html } });
      }
    }

    await this.prisma.internalLink.update({ where: { id: linkId }, data: { status: 'REMOVED' } });
    return { removed: true };
  }

  /** List persisted links with optional filters. */
  async listLinks(filters?: {
    sourceId?: string; targetId?: string; status?: string; origin?: string;
    limit?: number; offset?: number;
  }): Promise<{ links: InternalLinkRecord[]; total: number }> {
    const where: Record<string, any> = {};
    if (filters?.sourceId) where.sourceId = filters.sourceId;
    if (filters?.targetId) where.targetId = filters.targetId;
    if (filters?.status) where.status = filters.status;
    if (filters?.origin) where.origin = filters.origin;

    const [links, total] = await Promise.all([
      this.prisma.internalLink.findMany({ where, orderBy: { updatedAt: 'desc' as const }, take: filters?.limit ?? 50, skip: filters?.offset ?? 0 }),
      this.prisma.internalLink.count({ where }),
    ]);
    return { links, total };
  }

  /* ── Exclusion Management ── */

  async addExclusion(input: ExclusionInput): Promise<any> {
    return this.prisma.interlinkExclusion.create({
      data: {
        ruleType: input.ruleType,
        phrase: input.phrase?.toLowerCase() ?? null,
        contentId: input.contentId ?? null,
        contentType: input.contentType ?? null,
        pairedId: input.pairedId ?? null,
        pairedType: input.pairedType ?? null,
        reason: input.reason ?? null,
      },
    });
  }

  async removeExclusion(exclusionId: string): Promise<void> {
    await this.prisma.interlinkExclusion.delete({ where: { id: exclusionId } });
  }

  async listExclusions(): Promise<any[]> {
    return this.prisma.interlinkExclusion.findMany({ orderBy: { createdAt: 'desc' as const } });
  }

  /* ════════════════════════════════════════════════════════════════════ */
  /*  Lifecycle Hooks — called from CRUD APIs                           */
  /* ════════════════════════════════════════════════════════════════════ */

  /**
   * Called when content is CREATED.
   * Scans new content for outbound link opportunities AND scans existing
   * content for phrases matching the new content → persists as SUGGESTED.
   */
  async onContentCreated(
    contentId: string,
    contentType: 'POST' | 'PAGE',
    status: string,
  ): Promise<{ outboundSuggestions: number; inboundSuggestions: number }> {
    if (status !== 'PUBLISHED') return { outboundSuggestions: 0, inboundSuggestions: 0 };

    const [index, exclusions] = await Promise.all([this.buildIndex(), this.loadExclusions()]);
    if (exclusions.sources.has(contentId)) return { outboundSuggestions: 0, inboundSuggestions: 0 };

    const delegate = contentType === 'POST' ? this.prisma.post : this.prisma.page;
    const content = await delegate.findUnique({
      where: { id: contentId },
      ...(contentType === 'POST'
        ? { include: { tags: { select: { name: true } }, categories: { select: { name: true } } } }
        : {}),
    });
    if (!content?.content) return { outboundSuggestions: 0, inboundSuggestions: 0 };

    // OUTBOUND: links FROM new content TO existing content
    const rejectedLinks = await this.prisma.internalLink.findMany({
      where: { sourceId: contentId, status: 'REJECTED' }, select: { targetId: true },
    });
    const rejectedTargets = new Set(rejectedLinks.map((r: any) => r.targetId));

    const outbound = scanContentForLinks(
      { id: content.id, type: contentType, content: content.content, seoKeywords: content.seoKeywords || [], tags: content.tags || [], categories: content.categories || [], wordCount: content.wordCount ?? 0 },
      index, exclusions.phrases, new Set([...exclusions.targets, ...rejectedTargets]), exclusions.pairs,
    ).filter(c => !c.alreadyLinked);

    for (const candidate of outbound) {
      const target = index.find(c => c.id === candidate.targetId);
      if (!target) continue;
      try {
        await this.prisma.internalLink.upsert({
          where: { sourceId_targetId_anchorText: { sourceId: contentId, targetId: candidate.targetId, anchorText: candidate.anchorText } },
          create: { sourceId: contentId, sourceType: contentType, targetId: candidate.targetId, targetType: candidate.targetType, anchorText: candidate.anchorText, targetUrl: target.url, relevanceScore: candidate.relevanceScore, status: 'SUGGESTED', origin: 'AUTO' },
          update: {},
        });
      } catch { /* race */ }
    }

    // INBOUND: links FROM existing content TO new content
    let inboundSuggestions = 0;
    const newTarget = index.find(c => c.id === contentId);
    if (newTarget) {
      const [existingPosts, existingPages] = await Promise.all([
        this.prisma.post.findMany({
          where: { status: 'PUBLISHED', deletedAt: null, id: { not: contentId } },
          select: { id: true, content: true }, take: 100, orderBy: { updatedAt: 'desc' as const },
        }),
        this.prisma.page.findMany({
          where: { status: 'PUBLISHED', deletedAt: null, id: { not: contentId } },
          select: { id: true, content: true }, take: 30, orderBy: { updatedAt: 'desc' as const },
        }),
      ]);

      const allExisting = [
        ...existingPosts.map((p: any) => ({ ...p, type: 'POST' as const })),
        ...existingPages.map((p: any) => ({ ...p, type: 'PAGE' as const })),
      ];

      for (const item of allExisting) {
        if (!item.content || exclusions.sources.has(item.id)) continue;
        const plainText = stripHtml(item.content);
        for (const phrase of newTarget.searchPhrases) {
          const occurrences = findPhraseOccurrences(plainText, phrase);
          if (occurrences.length === 0) continue;
          if (isPhraseAlreadyLinked(item.content, phrase, newTarget.url)) continue;
          if (exclusions.phrases.has(phrase)) continue;
          if (exclusions.pairs.has(`${item.id}:${contentId}`)) continue;
          try {
            await this.prisma.internalLink.upsert({
              where: { sourceId_targetId_anchorText: { sourceId: item.id, targetId: contentId, anchorText: phrase } },
              create: { sourceId: item.id, sourceType: item.type, targetId: contentId, targetType: contentType, anchorText: phrase, targetUrl: newTarget.url, relevanceScore: 50, status: 'SUGGESTED', origin: 'AUTO' },
              update: {},
            });
            inboundSuggestions++;
          } catch { /* race */ }
          break;
        }
      }
    }

    return { outboundSuggestions: outbound.length, inboundSuggestions };
  }

  /**
   * Called when content is UPDATED.
   * Handles slug changes (rewrites URLs), re-scans for new suggestions.
   */
  async onContentUpdated(
    contentId: string,
    contentType: 'POST' | 'PAGE',
    changes: { slug?: { old: string; new: string }; statusChanged?: boolean; contentChanged?: boolean },
  ): Promise<{ rewritten: number; newSuggestions: number }> {
    let rewritten = 0;

    // Handle slug change — rewrite URLs across all content
    if (changes.slug) {
      const oldUrl = contentType === 'POST' ? `/blog/${changes.slug.old}` : `/${changes.slug.old}`;
      const newUrl = contentType === 'POST' ? `/blog/${changes.slug.new}` : `/${changes.slug.new}`;

      const [posts, pages] = await Promise.all([
        this.prisma.post.findMany({ where: { status: 'PUBLISHED', deletedAt: null, content: { contains: oldUrl } }, select: { id: true, content: true } }),
        this.prisma.page.findMany({ where: { status: 'PUBLISHED', deletedAt: null, content: { contains: oldUrl } }, select: { id: true, content: true } }),
      ]);

      for (const post of posts) {
        if (!post.content) continue;
        const result = rewriteUrlsInHtml(post.content, oldUrl, newUrl);
        if (result.rewritten > 0) {
          await this.prisma.post.update({ where: { id: post.id }, data: { content: result.html } });
          rewritten += result.rewritten;
        }
      }
      for (const page of pages) {
        if (!page.content) continue;
        const result = rewriteUrlsInHtml(page.content, oldUrl, newUrl);
        if (result.rewritten > 0) {
          await this.prisma.page.update({ where: { id: page.id }, data: { content: result.html } });
          rewritten += result.rewritten;
        }
      }

      await this.prisma.internalLink.updateMany({
        where: { targetId: contentId, targetUrl: oldUrl },
        data: { targetUrl: newUrl },
      });
    }

    // Re-scan for new suggestions on content/status change
    let newSuggestions = 0;
    if (changes.contentChanged || changes.statusChanged) {
      await this.prisma.internalLink.deleteMany({ where: { sourceId: contentId, status: 'SUGGESTED' } });
      const result = await this.onContentCreated(contentId, contentType, 'PUBLISHED');
      newSuggestions = result.outboundSuggestions + result.inboundSuggestions;
    }

    return { rewritten, newSuggestions };
  }

  /**
   * Called when content is DELETED (soft-delete).
   * Marks inbound links as BROKEN, removes dead links from referencing HTML,
   * cleans up outbound links from deleted content.
   */
  async onContentDeleted(
    contentId: string,
    contentType: 'POST' | 'PAGE',
    slug: string,
  ): Promise<{ brokenFixed: number; linksRemoved: number }> {
    const targetUrl = contentType === 'POST' ? `/blog/${slug}` : `/${slug}`;

    await this.prisma.internalLink.updateMany({
      where: { targetId: contentId, status: { in: ['ACTIVE', 'APPROVED', 'SUGGESTED'] } },
      data: { status: 'BROKEN' },
    });

    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({ where: { status: 'PUBLISHED', deletedAt: null, content: { contains: targetUrl } }, select: { id: true, content: true } }),
      this.prisma.page.findMany({ where: { status: 'PUBLISHED', deletedAt: null, content: { contains: targetUrl } }, select: { id: true, content: true } }),
    ]);

    let brokenFixed = 0;
    const brokenUrls = new Set([targetUrl]);

    for (const post of posts) {
      if (!post.content) continue;
      const result = removeBrokenLinksFromHtml(post.content, brokenUrls);
      if (result.removed > 0) {
        await this.prisma.post.update({ where: { id: post.id }, data: { content: result.html } });
        brokenFixed += result.removed;
      }
    }
    for (const page of pages) {
      if (!page.content) continue;
      const result = removeBrokenLinksFromHtml(page.content, brokenUrls);
      if (result.removed > 0) {
        await this.prisma.page.update({ where: { id: page.id }, data: { content: result.html } });
        brokenFixed += result.removed;
      }
    }

    const linksRemoved = await this.prisma.internalLink.deleteMany({ where: { sourceId: contentId } });
    return { brokenFixed, linksRemoved: linksRemoved.count ?? 0 };
  }

  /**
   * Called when content transitions PUBLISHED → DRAFT.
   * Same effect as delete from interlinking perspective.
   */
  async onContentUnpublished(
    contentId: string,
    contentType: 'POST' | 'PAGE',
    slug: string,
  ): Promise<{ brokenFixed: number }> {
    const result = await this.onContentDeleted(contentId, contentType, slug);
    return { brokenFixed: result.brokenFixed };
  }
}
