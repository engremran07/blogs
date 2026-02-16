/**
 * ============================================================================
 * MODULE  : seo/interlink.service.ts
 * PURPOSE : Intelligent auto-interlinking engine for posts ↔ pages.
 *
 * Features:
 *   1. Content scanning — finds potential anchor text in body HTML
 *   2. Candidate matching — matches phrases against existing post/page titles & slugs
 *   3. Link map persistence — stores discovered links in InternalLink table
 *   4. Auto-injection — inserts <a> tags into content at save/cron time
 *   5. Broken link detection — verifies all internal links target live content
 *   6. Bidirectional linking — posts→pages, pages→posts, posts→posts, pages→pages
 *   7. Content similarity scoring via keyword/tag overlap
 *   8. Link reports — orphan pages, hub pages, link graph stats
 * ============================================================================
 */

import { stripHtml, extractLinks } from './seo-audit.util';
import { extractKeywords } from './seo-text.util';

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export interface LinkCandidate {
  /** Source content ID */
  sourceId: string;
  sourceType: 'POST' | 'PAGE';
  /** Target content ID */
  targetId: string;
  targetType: 'POST' | 'PAGE';
  /** The matched anchor text found in source body */
  anchorText: string;
  /** Character offset in stripped text where match was found */
  matchOffset: number;
  /** Relevance score 0–100 */
  relevanceScore: number;
  /** Whether this link already exists in the content as <a> tag */
  alreadyLinked: boolean;
}

export interface InternalLinkRecord {
  id: string;
  sourceId: string;
  sourceType: 'POST' | 'PAGE';
  targetId: string;
  targetType: 'POST' | 'PAGE';
  anchorText: string;
  anchorTextVerified: boolean;
  autoInserted: boolean;
  relevanceScore: number;
  status: 'ACTIVE' | 'BROKEN' | 'REMOVED' | 'SUGGESTED';
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
}

/* ========================================================================== */
/*  Constants                                                                 */
/* ========================================================================== */

/** Minimum word length for anchor text matching */
const MIN_ANCHOR_WORDS = 2;
/** Maximum links to auto-insert per piece of content */
const MAX_AUTO_LINKS_PER_CONTENT = 8;
/** Minimum relevance score to consider a candidate */
const MIN_RELEVANCE_SCORE = 25;
/** Minimum content word count to be eligible for linking */
const MIN_CONTENT_WORDS = 50;
/** Skip very short anchor text */
const MIN_ANCHOR_LENGTH = 4;

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */

/**
 * Builds an index of all linkable content: titles, slugs, keywords.
 * Each entry is a potential link target.
 */
interface ContentIndex {
  id: string;
  type: 'POST' | 'PAGE';
  title: string;
  slug: string;
  url: string;
  keywords: string[];
  /** Lowercase title and keyword phrases for matching */
  searchPhrases: string[];
  status: string;
}

function buildContentIndex(
  posts: any[],
  pages: any[],
): ContentIndex[] {
  const index: ContentIndex[] = [];

  for (const post of posts) {
    const keywords = (post.seoKeywords || []) as string[];
    const tagNames = (post.tags || []).map((t: any) => t.name);
    const catNames = (post.categories || []).map((c: any) => c.name);
    const allPhrases = [
      post.title,
      ...keywords,
      ...tagNames,
      ...catNames,
    ].filter(Boolean);

    index.push({
      id: post.id,
      type: 'POST',
      title: post.title,
      slug: post.slug,
      url: `/blog/${post.slug}`,
      keywords: [...keywords, ...tagNames],
      searchPhrases: allPhrases.map((p: string) => p.toLowerCase().trim()).filter((p: string) => p.length >= MIN_ANCHOR_LENGTH),
      status: post.status,
    });
  }

  for (const page of pages) {
    const allPhrases = [page.title].filter(Boolean);

    index.push({
      id: page.id,
      type: 'PAGE',
      title: page.title,
      slug: page.slug,
      url: `/${page.slug}`,
      keywords: [],
      searchPhrases: allPhrases.map((p: string) => p.toLowerCase().trim()).filter((p: string) => p.length >= MIN_ANCHOR_LENGTH),
      status: page.status,
    });
  }

  return index;
}

/**
 * Checks whether a piece of text (the content body) contains
 * a given phrase as a standalone word boundary match.
 */
function findPhraseOccurrences(
  text: string,
  phrase: string,
): { offset: number; length: number }[] {
  const results: { offset: number; length: number }[] = [];
  const lower = text.toLowerCase();
  const phraseLower = phrase.toLowerCase();

  // Word-boundary match using regex
  const escaped = phraseLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(lower)) !== null) {
    results.push({ offset: match.index, length: phraseLower.length });
  }

  return results;
}

/**
 * Check if a particular phrase is already wrapped in an <a> tag
 * in the original HTML content.
 */
function isPhraseAlreadyLinked(
  html: string,
  phrase: string,
  targetUrl: string,
): boolean {
  const lower = html.toLowerCase();
  const phraseLower = phrase.toLowerCase();

  // Check if there's an <a> tag containing this phrase
  const linkRegex = /<a\s[^>]*href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(lower)) !== null) {
    const linkText = stripHtml(match[1]).toLowerCase().trim();
    if (linkText.includes(phraseLower)) return true;
  }

  // Also check if the target URL is already linked from the content
  if (lower.includes(`href="${targetUrl.toLowerCase()}"`) ||
      lower.includes(`href='${targetUrl.toLowerCase()}'`)) {
    return true;
  }

  return false;
}

/**
 * Calculate relevance score between source content and target.
 * Factors: keyword overlap, tag/category overlap, title match quality.
 */
function calculateRelevance(
  sourceKeywords: string[],
  sourceTags: string[],
  sourceCategories: string[],
  target: ContentIndex,
): number {
  let score = 0;

  // Base score for title match found in body
  score += 30;

  // Keyword overlap (up to 30 pts)
  const srcKw = new Set(sourceKeywords.map(k => k.toLowerCase()));
  const tgtKw = new Set(target.keywords.map(k => k.toLowerCase()));
  let kwOverlap = 0;
  for (const k of srcKw) {
    if (tgtKw.has(k)) kwOverlap++;
  }
  score += Math.min(30, kwOverlap * 10);

  // Tag/category overlap (up to 20 pts)
  const srcTags = new Set([...sourceTags, ...sourceCategories].map(t => t.toLowerCase()));
  const tgtPhrases = new Set(target.searchPhrases);
  let tagOverlap = 0;
  for (const t of srcTags) {
    if (tgtPhrases.has(t)) tagOverlap++;
  }
  score += Math.min(20, tagOverlap * 10);

  // Published content bonus (up to 20 pts)
  if (target.status === 'PUBLISHED') score += 20;

  return Math.min(100, score);
}

/* ========================================================================== */
/*  Core Scanner                                                              */
/* ========================================================================== */

/**
 * Scan a single piece of content for interlinking opportunities.
 * Finds phrases in the body that match titles/keywords of other content.
 */
export function scanContentForLinks(
  source: {
    id: string;
    type: 'POST' | 'PAGE';
    content: string;
    seoKeywords?: string[];
    tags?: { name: string }[];
    categories?: { name: string }[];
  },
  contentIndex: ContentIndex[],
): LinkCandidate[] {
  const candidates: LinkCandidate[] = [];
  const plainText = stripHtml(source.content);

  if (plainText.split(/\s+/).length < MIN_CONTENT_WORDS) return candidates;

  const sourceKeywords = (source.seoKeywords || []);
  const sourceTags = (source.tags || []).map(t => t.name);
  const sourceCategories = (source.categories || []).map(c => c.name);

  // Track already-matched targets to avoid duplicates
  const matchedTargets = new Set<string>();

  for (const target of contentIndex) {
    // Skip self-linking
    if (target.id === source.id) continue;
    // Skip already matched
    if (matchedTargets.has(target.id)) continue;
    // Skip non-published content
    if (target.status !== 'PUBLISHED') continue;

    // Try each searchable phrase for this target
    for (const phrase of target.searchPhrases) {
      if (phrase.split(/\s+/).length < MIN_ANCHOR_WORDS && phrase.length < 8) continue;

      const occurrences = findPhraseOccurrences(plainText, phrase);
      if (occurrences.length === 0) continue;

      // Found a match!
      const alreadyLinked = isPhraseAlreadyLinked(
        source.content,
        phrase,
        target.url,
      );

      const relevance = calculateRelevance(
        sourceKeywords,
        sourceTags,
        sourceCategories,
        target,
      );

      if (relevance < MIN_RELEVANCE_SCORE) continue;

      // Use the original-case text for the anchor
      const firstOccurrence = occurrences[0];
      const originalAnchor = plainText.substring(
        firstOccurrence.offset,
        firstOccurrence.offset + firstOccurrence.length,
      );

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
      break; // One match per target is enough
    }
  }

  // Sort by relevance descending, cap at max
  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return candidates.slice(0, MAX_AUTO_LINKS_PER_CONTENT * 2); // return extras for admin choice
}

/* ========================================================================== */
/*  Link Injection                                                            */
/* ========================================================================== */

/**
 * Insert <a> links into HTML content for verified candidates.
 * Only injects if the anchor text exists un-linked in the body.
 * Returns the modified HTML and count of inserted links.
 */
export function injectLinksIntoContent(
  html: string,
  candidates: LinkCandidate[],
  contentIndex: ContentIndex[],
): { html: string; inserted: number } {
  let result = html;
  let inserted = 0;
  const targetMap = new Map(contentIndex.map(c => [c.id, c]));

  // Only inject for un-linked, high-relevance candidates
  const toInject = candidates
    .filter(c => !c.alreadyLinked && c.relevanceScore >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_AUTO_LINKS_PER_CONTENT);

  for (const candidate of toInject) {
    const target = targetMap.get(candidate.targetId);
    if (!target) continue;

    const phrase = candidate.anchorText;
    if (!phrase || phrase.length < MIN_ANCHOR_LENGTH) continue;

    // Verify the phrase exists in the HTML (not inside an <a> tag or HTML attribute)
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match phrase NOT inside <a> tags — use a negative lookbehind/lookahead approach
    // We'll match the phrase when it's inside a text node (not inside <a>...</a>)
    const safeRegex = new RegExp(
      `(?<![<\\/a-z"'=])\\b(${escaped})\\b(?![^<]*<\\/a>)`,
      'i',
    );

    const match = safeRegex.exec(result);
    if (!match) continue;

    // Build the link
    const link = `<a href="${target.url}" title="${target.title}" data-interlink="auto">${match[1]}</a>`;
    result = result.substring(0, match.index) + link + result.substring(match.index + match[0].length);
    inserted++;
  }

  return { html: result, inserted };
}

/* ========================================================================== */
/*  Broken Link Detector                                                      */
/* ========================================================================== */

/**
 * Detect broken internal links in HTML content.
 * A link is broken if its href starts with / but no post/page exists at that path.
 */
export function detectBrokenLinks(
  html: string,
  contentIndex: ContentIndex[],
): { href: string; anchorText: string }[] {
  const links = extractLinks(html);
  const broken: { href: string; anchorText: string }[] = [];

  // Build URL set from content index
  const validUrls = new Set(contentIndex.map(c => c.url));
  // Also add common static routes
  const staticRoutes = ['/', '/blog', '/about', '/contact', '/tags', '/search', '/login', '/register', '/profile'];
  for (const route of staticRoutes) validUrls.add(route);

  for (const link of links) {
    // Only check internal links
    if (!link.href.startsWith('/') || link.href.startsWith('//')) continue;
    if (link.href.startsWith('#')) continue;
    if (link.href.startsWith('/api/')) continue;

    // Strip query params and hash
    const cleanHref = link.href.split('?')[0].split('#')[0];

    if (!validUrls.has(cleanHref)) {
      broken.push({ href: link.href, anchorText: link.text });
    }
  }

  return broken;
}

/* ========================================================================== */
/*  Full Interlink Service                                                    */
/* ========================================================================== */

export class InterlinkService {
  constructor(private prisma: InterlinkPrisma) {}

  /** Build a fresh content index from all published posts and pages. */
  async buildIndex(): Promise<ContentIndex[]> {
    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          id: true, title: true, slug: true, status: true,
          seoKeywords: true,
          tags: { select: { name: true } },
          categories: { select: { name: true } },
        },
      }),
      this.prisma.page.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { id: true, title: true, slug: true, status: true },
      }),
    ]);

    return buildContentIndex(posts, pages);
  }

  /**
   * Scan a single post or page for interlinking opportunities.
   * Returns candidates and broken links.
   */
  async scanSingle(
    contentId: string,
    contentType: 'POST' | 'PAGE',
  ): Promise<InterlinkScanResult> {
    const index = await this.buildIndex();

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

    const existingLinks = extractLinks(content.content || '')
      .filter((l: { href: string }) => l.href.startsWith('/'))
      .length;

    const candidates = scanContentForLinks(
      {
        id: content.id,
        type: contentType,
        content: content.content || '',
        seoKeywords: content.seoKeywords || [],
        tags: content.tags || [],
        categories: content.categories || [],
      },
      index,
    );

    const brokenLinks = detectBrokenLinks(content.content || '', index);

    return {
      sourceId: contentId,
      sourceType: contentType,
      existingLinks,
      newCandidates: candidates.filter(c => !c.alreadyLinked),
      brokenLinks,
      autoInserted: 0,
    };
  }

  /**
   * Auto-insert links into a single piece of content and save.
   */
  async autoLinkContent(
    contentId: string,
    contentType: 'POST' | 'PAGE',
  ): Promise<{ inserted: number; brokenFixed: number }> {
    const index = await this.buildIndex();
    const delegate = contentType === 'POST' ? this.prisma.post : this.prisma.page;

    const content = await delegate.findUnique({
      where: { id: contentId },
      ...(contentType === 'POST'
        ? { include: { tags: { select: { name: true } }, categories: { select: { name: true } } } }
        : {}),
    });

    if (!content || !content.content) {
      return { inserted: 0, brokenFixed: 0 };
    }

    const candidates = scanContentForLinks(
      {
        id: content.id,
        type: contentType,
        content: content.content,
        seoKeywords: content.seoKeywords || [],
        tags: content.tags || [],
        categories: content.categories || [],
      },
      index,
    );

    const { html, inserted } = injectLinksIntoContent(
      content.content,
      candidates,
      index,
    );

    if (inserted > 0) {
      await delegate.update({
        where: { id: contentId },
        data: { content: html },
      });
    }

    return { inserted, brokenFixed: 0 };
  }

  /**
   * Scan and auto-link ALL published posts and pages.
   * Used by the cron job.
   */
  async autoLinkAll(
    limit: number = 50,
  ): Promise<{
    scanned: number;
    totalInserted: number;
    totalBroken: number;
    details: { id: string; type: string; inserted: number; broken: number }[];
  }> {
    const index = await this.buildIndex();

    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          id: true, content: true, seoKeywords: true,
          tags: { select: { name: true } },
          categories: { select: { name: true } },
        },
        take: Math.ceil(limit * 0.7),
        orderBy: { updatedAt: 'asc' as const },
      }),
      this.prisma.page.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { id: true, content: true },
        take: Math.ceil(limit * 0.3),
        orderBy: { updatedAt: 'asc' as const },
      }),
    ]);

    const details: { id: string; type: string; inserted: number; broken: number }[] = [];
    let totalInserted = 0;
    let totalBroken = 0;

    for (const post of posts) {
      if (!post.content) continue;
      const candidates = scanContentForLinks(
        { id: post.id, type: 'POST', content: post.content, seoKeywords: post.seoKeywords || [], tags: post.tags || [], categories: post.categories || [] },
        index,
      );
      const broken = detectBrokenLinks(post.content, index);
      const { html, inserted } = injectLinksIntoContent(post.content, candidates, index);

      if (inserted > 0) {
        await this.prisma.post.update({ where: { id: post.id }, data: { content: html } });
      }

      totalInserted += inserted;
      totalBroken += broken.length;
      details.push({ id: post.id, type: 'POST', inserted, broken: broken.length });
    }

    for (const page of pages) {
      if (!page.content) continue;
      const candidates = scanContentForLinks(
        { id: page.id, type: 'PAGE', content: page.content },
        index,
      );
      const broken = detectBrokenLinks(page.content, index);
      const { html, inserted } = injectLinksIntoContent(page.content, candidates, index);

      if (inserted > 0) {
        await this.prisma.page.update({ where: { id: page.id }, data: { content: html } });
      }

      totalInserted += inserted;
      totalBroken += broken.length;
      details.push({ id: page.id, type: 'PAGE', inserted, broken: broken.length });
    }

    return {
      scanned: posts.length + pages.length,
      totalInserted,
      totalBroken,
      details,
    };
  }

  /**
   * Generate a full interlink health report.
   */
  async generateReport(): Promise<InterlinkReport> {
    const index = await this.buildIndex();

    const [posts, pages] = await Promise.all([
      this.prisma.post.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { id: true, title: true, content: true },
      }),
      this.prisma.page.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { id: true, title: true, content: true },
      }),
    ]);

    const allContent = [
      ...posts.map((p: any) => ({ ...p, type: 'POST' })),
      ...pages.map((p: any) => ({ ...p, type: 'PAGE' })),
    ];

    // Build link graph: outbound and inbound counts
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
      const links = extractLinks(item.content || '')
        .filter((l: { href: string }) => l.href.startsWith('/'));

      outbound.set(item.id, links.length);

      for (const link of links) {
        const cleanHref = link.href.split('?')[0].split('#')[0];
        const targetId = urlToId.get(cleanHref);
        if (targetId) {
          inbound.set(targetId, (inbound.get(targetId) || 0) + 1);
        }
      }

      // Broken links
      const broken = detectBrokenLinks(item.content || '', index);
      for (const b of broken) {
        allBroken.push({ sourceId: item.id, sourceType: item.type, href: b.href });
      }
    }

    // Orphan content: 0 inbound + 0 outbound links
    const orphanContent = allContent
      .filter(c => (inbound.get(c.id) || 0) === 0 && (outbound.get(c.id) || 0) === 0)
      .map(c => ({ id: c.id, title: c.title, type: c.type }));

    // Hub content: most outbound + inbound
    const hubContent = allContent
      .map(c => ({
        id: c.id,
        title: c.title,
        type: c.type,
        outboundLinks: outbound.get(c.id) || 0,
        inboundLinks: inbound.get(c.id) || 0,
      }))
      .sort((a, b) => (b.outboundLinks + b.inboundLinks) - (a.outboundLinks + a.inboundLinks))
      .slice(0, 10);

    // Link distribution
    const totalLinks = Array.from(outbound.values()).reduce((s, v) => s + v, 0);
    const distribution: { range: string; count: number }[] = [
      { range: '0 links', count: Array.from(outbound.values()).filter(v => v === 0).length },
      { range: '1-2 links', count: Array.from(outbound.values()).filter(v => v >= 1 && v <= 2).length },
      { range: '3-5 links', count: Array.from(outbound.values()).filter(v => v >= 3 && v <= 5).length },
      { range: '6-10 links', count: Array.from(outbound.values()).filter(v => v >= 6 && v <= 10).length },
      { range: '10+ links', count: Array.from(outbound.values()).filter(v => v > 10).length },
    ];

    return {
      totalContent: allContent.length,
      totalLinks,
      avgLinksPerContent: allContent.length > 0 ? Math.round((totalLinks / allContent.length) * 10) / 10 : 0,
      orphanContent,
      hubContent,
      brokenLinks: allBroken,
      linkDistribution: distribution,
    };
  }
}
