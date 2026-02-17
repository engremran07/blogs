// blog/constants.ts
// Shared constants and helpers for the Blog module.
// Framework-agnostic — zero external dependencies.

/* ========================================================================== */
/*  CACHE                                                                     */
/* ========================================================================== */

export const CACHE_PREFIX = 'blog';

export const CACHE_KEYS = {
  postBySlug: (slug: string) => `${CACHE_PREFIX}:post:slug:${slug}`,
  postById: (id: string) => `${CACHE_PREFIX}:post:id:${id}`,
  postList: (hash: string) => `${CACHE_PREFIX}:posts:${hash}`,
  categories: (publicOnly = false) => `${CACHE_PREFIX}:categories:${publicOnly ? 'public' : 'all'}`,
  categoryTree: () => `${CACHE_PREFIX}:categories:tree`,
  categoryBreadcrumb: (id: string) => `${CACHE_PREFIX}:category:breadcrumb:${id}`,
  series: (id: string) => `${CACHE_PREFIX}:series:${id}`,
  seriesList: () => `${CACHE_PREFIX}:series:all`,
  relatedPosts: (postId: string) => `${CACHE_PREFIX}:related:${postId}`,
  popularPosts: (limit: number) => `${CACHE_PREFIX}:popular:${limit}`,
  featuredPosts: () => `${CACHE_PREFIX}:featured`,
  pinnedPosts: () => `${CACHE_PREFIX}:pinned`,
  postStats: () => `${CACHE_PREFIX}:stats`,
  adjacentPosts: (postId: string) => `${CACHE_PREFIX}:adjacent:${postId}`,
  searchSuggestions: (query: string) => `${CACHE_PREFIX}:suggest:${query}`,
  toc: (postId: string) => `${CACHE_PREFIX}:toc:${postId}`,
  rssFeed: () => `${CACHE_PREFIX}:rss`,
  sitemapUrls: () => `${CACHE_PREFIX}:sitemap`,
  postQuotes: (postId: string) => `${CACHE_PREFIX}:quotes:${postId}`,
} as const;

export const CACHE_TTL = {
  postDetail: 300,         // 5 min
  postList: 120,           // 2 min
  categories: 600,         // 10 min
  series: 600,             // 10 min
  relatedPosts: 900,       // 15 min
  popularPosts: 600,       // 10 min
  featured: 600,           // 10 min
  pinned: 600,             // 10 min
  stats: 300,              // 5 min
  adjacent: 600,           // 10 min
  suggestions: 60,         // 1 min
  toc: 1800,               // 30 min
  rssFeed: 300,            // 5 min
  sitemap: 600,            // 10 min
  breadcrumb: 600,         // 10 min
  quotes: 600,             // 10 min
} as const;

/* ========================================================================== */
/*  LIMITS & DEFAULTS                                                         */
/* ========================================================================== */

export const BLOG_LIMITS = {
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  SLUG_MAX_LENGTH: 250,
  EXCERPT_MAX_LENGTH: 500,
  MAX_POSTS_PER_PAGE: 100,
  MAX_CATEGORIES_PER_POST: 5,
  MAX_RELATED_POSTS: 6,
  MAX_BULK_SIZE: 100,
  SLUG_COUNTER_MAX: 50,
  CATEGORY_NAME_MAX: 100,
  SERIES_TITLE_MAX: 200,
  CHANGE_NOTE_MAX: 500,
  PASSWORD_MAX: 128,
  CANONICAL_URL_MAX: 2048,
  SEARCH_MAX_LENGTH: 200,
  MAX_DEPTH_CATEGORY: 10,
  GUEST_NAME_MAX: 150,
  GUEST_BIO_MAX: 500,
  GUEST_EMAIL_MAX: 320,
  GUEST_URL_MAX: 500,
  QUOTE_TEXT_MAX: 2000,
  QUOTE_ATTRIBUTION_MAX: 200,
  QUOTE_SOURCE_MAX: 300,
  MAX_QUOTES_PER_POST: 20,
  SEARCH_SUGGESTIONS_MAX: 10,
  RSS_MAX_ITEMS: 50,
  SITEMAP_MAX_ITEMS: 5000,
} as const;

export const BLOG_DEFAULTS = {
  postsPerPage: 10,
  maxCategoriesPerPost: 5,
  minWordCount: 50,
  readingSpeedWpm: 200,
  blogBaseUrl: '/blog',
  excerptLength: 200,
  lockTimeoutMinutes: 30,
  maxRevisionsPerPost: 50,
  maxRelatedPosts: 6,
  allowComments: true,
  blogFeedTitle: 'Blog',
  blogFeedDescription: 'Latest blog posts',
  blogFeedLanguage: 'en',
} as const;

/* ========================================================================== */
/*  HELPERS                                                                   */
/* ========================================================================== */

/** Generate a URL-friendly slug from text. */
export function generateSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')      // only alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

/** Capitalize the first letter of a string. */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Calculate reading time in minutes. */
export function calculateReadingTime(wordCount: number, wpm = 200): number {
  return Math.max(1, Math.ceil(wordCount / wpm));
}

/** Count words in text (strips HTML tags). */
export function countWords(text: string): number {
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(' ').filter(w => w.length > 0).length;
}

/** Extract plain text from HTML. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Truncate text to a maximum length, appending '…' if truncated. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  // Try to break at word boundary
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const breakAt = lastSpace > maxLength * 0.6 ? lastSpace : maxLength - 1;
  return `${text.slice(0, breakAt).trimEnd()}…`;
}

/** Normalize an array of IDs — deduplicate and filter empty. */
export function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(
    ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
  )];
}

/** Generate an excerpt from HTML content. */
export function generateExcerpt(content: string, maxLength = 200): string {
  const plain = stripHtml(content);
  if (!plain) return '';
  return truncate(plain, maxLength);
}

/** Check if a date is in the past. */
export function isPast(date: Date): boolean {
  return date.getTime() <= Date.now();
}

/** Create a stable hash from listing options for cache keys. */
export function hashListOptions(opts: Record<string, unknown>): string {
  const sorted = Object.keys(opts)
    .sort()
    .filter(k => opts[k] !== undefined && opts[k] !== null)
    .map(k => `${k}=${String(opts[k])}`)
    .join('&');
  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash + sorted.charCodeAt(i)) & 0x7fffffff;
  }
  return hash.toString(36);
}

/**
 * Extract a table of contents from HTML content by parsing heading tags.
 * Returns a nested hierarchy of h1–h6 entries.
 */
export function extractHeadings(html: string): Array<{ id: string; text: string; level: number }> {
  const headingRegex = /<h([1-6])(?:\s[^>]*id=["']([^"']*)["'][^>]*)?>([\s\S]*?)<\/h\1>/gi;
  const headings: Array<{ id: string; text: string; level: number }> = [];
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2] || `heading-${++counter}`;
    const text = match[3].replace(/<[^>]*>/g, '').trim();
    if (text) headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Build nested TOC tree from flat heading list.
 */
export function buildTocTree(
  headings: Array<{ id: string; text: string; level: number }>,
): Array<{ id: string; text: string; level: number; children: unknown[] }> {
  type TocNode = { id: string; text: string; level: number; children: TocNode[] };
  const root: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const h of headings) {
    const node: TocNode = { id: h.id, text: h.text, level: h.level, children: [] };

    // Pop stack until we find a parent with a lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return root;
}

/**
 * Extract blockquotes from HTML content.
 */
export function extractBlockquotes(html: string): Array<{ text: string; cite: string | null }> {
  const bqRegex = /<blockquote(?:\s[^>]*cite=["']([^"']*)["'][^>]*)?>([\s\S]*?)<\/blockquote>/gi;
  const quotes: Array<{ text: string; cite: string | null }> = [];
  let match: RegExpExecArray | null;

  while ((match = bqRegex.exec(html)) !== null) {
    const cite = match[1] || null;
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) quotes.push({ text, cite });
  }

  return quotes;
}

/**
 * Generate RFC-822 date string for RSS feeds.
 */
export function toRfc822(date: Date): string {
  return date.toUTCString();
}

/**
 * Generate W3C datetime for sitemaps.
 */
export function toW3CDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
