/**
 * ============================================================================
 * MODULE  : seo/sitemap.util.ts
 * PURPOSE : Pure sitemap XML generation — urlset, index, image, news, XSL
 * PATTERN : Framework-agnostic, zero side-effects
 * ============================================================================
 */

import type {
  SitemapEntry,
  SitemapConfig,
  SitemapStats,
  SitemapAlternate,
  SitemapImage,
  SitemapNews,
  SitemapChangeFrequency,
} from '../types';
import { SITEMAP_DEFAULTS, SITEMAP_XSL, SITEMAP_INDEX_XSL } from './constants';

/* ========================================================================== */
/*  SECTION 1 — XML Escape                                                    */
/* ========================================================================== */

/** Escape special XML characters. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ========================================================================== */
/*  SECTION 2 — Sitemap XML Generation                                        */
/* ========================================================================== */

/** Generate a complete sitemap XML document from entries. */
export function generateSitemapXml(
  entries: SitemapEntry[],
  options?: { withXsl?: boolean; xslPath?: string },
): string {
  const lines: string[] = [SITEMAP_DEFAULTS.XML_DECLARATION];

  if (options?.withXsl) {
    const xslHref = options.xslPath ?? '/sitemap.xsl';
    lines.push(`<?xml-stylesheet type="text/xsl" href="${escapeXml(xslHref)}"?>`);
  }

  lines.push(SITEMAP_DEFAULTS.URLSET_OPEN);

  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (entry.priority !== undefined) lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);

    // Image sitemap extension
    if (entry.images && entry.images.length > 0) {
      for (const img of entry.images) {
        lines.push('    <image:image>');
        lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
        if (img.caption) lines.push(`      <image:caption>${escapeXml(img.caption)}</image:caption>`);
        if (img.title) lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
        if (img.geoLocation) lines.push(`      <image:geo_location>${escapeXml(img.geoLocation)}</image:geo_location>`);
        if (img.license) lines.push(`      <image:license>${escapeXml(img.license)}</image:license>`);
        lines.push('    </image:image>');
      }
    }

    // News sitemap extension
    if (entry.news) {
      lines.push('    <news:news>');
      lines.push('      <news:publication>');
      lines.push(`        <news:name>${escapeXml(entry.news.publicationName)}</news:name>`);
      lines.push(`        <news:language>${escapeXml(entry.news.publicationLanguage)}</news:language>`);
      lines.push('      </news:publication>');
      lines.push(`      <news:publication_date>${escapeXml(entry.news.publicationDate)}</news:publication_date>`);
      lines.push(`      <news:title>${escapeXml(entry.news.title)}</news:title>`);
      if (entry.news.keywords && entry.news.keywords.length > 0) {
        lines.push(`      <news:keywords>${escapeXml(entry.news.keywords.join(', '))}</news:keywords>`);
      }
      lines.push('    </news:news>');
    }

    // Alternate language links (hreflang)
    if (entry.alternates && entry.alternates.length > 0) {
      for (const alt of entry.alternates) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}"/>`,
        );
      }
    }

    lines.push('  </url>');
  }

  lines.push(SITEMAP_DEFAULTS.URLSET_CLOSE);
  return lines.join('\n');
}

/** Generate a sitemap index XML document. */
export function generateSitemapIndexXml(
  sitemapUrls: { loc: string; lastmod?: string }[],
  options?: { withXsl?: boolean; xslPath?: string },
): string {
  const lines: string[] = [SITEMAP_DEFAULTS.XML_DECLARATION];

  if (options?.withXsl) {
    const xslHref = options.xslPath ?? '/sitemap-index.xsl';
    lines.push(`<?xml-stylesheet type="text/xsl" href="${escapeXml(xslHref)}"?>`);
  }

  lines.push(SITEMAP_DEFAULTS.SITEMAP_INDEX_OPEN);

  for (const sitemap of sitemapUrls) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${escapeXml(sitemap.loc)}</loc>`);
    if (sitemap.lastmod) lines.push(`    <lastmod>${escapeXml(sitemap.lastmod)}</lastmod>`);
    lines.push('  </sitemap>');
  }

  lines.push(SITEMAP_DEFAULTS.SITEMAP_INDEX_CLOSE);
  return lines.join('\n');
}

/* ========================================================================== */
/*  SECTION 3 — Sitemap Entry Builders                                        */
/* ========================================================================== */

/** Build sitemap entries for posts. */
export function buildPostEntries(
  posts: {
    slug: string;
    updatedAt?: Date | string;
    viewCount?: number;
    featuredImage?: string | null;
    title?: string;
    seoKeywords?: string[];
    publishedAt?: Date | string | null;
  }[],
  config: SitemapConfig,
): SitemapEntry[] {
  const excludeSlugs = new Set(config.excludeSlugs ?? []);
  const entries: SitemapEntry[] = [];

  for (const post of posts) {
    if (excludeSlugs.has(post.slug)) continue;

    const priority = calculatePriority(
      SITEMAP_DEFAULTS.POST_PRIORITY,
      post.viewCount,
      post.updatedAt,
    );

    const entry: SitemapEntry = {
      loc: `${config.baseUrl}/blog/${post.slug}`,
      lastmod: post.updatedAt
        ? new Date(post.updatedAt).toISOString()
        : undefined,
      changefreq: 'weekly',
      priority,
    };

    // Include images if configured
    if (config.includeImages && post.featuredImage) {
      entry.images = [
        {
          loc: post.featuredImage,
          title: post.title,
        },
      ];
    }

    // Include news if configured and post is fresh (< 48 hours)
    if (config.includeNews && post.publishedAt) {
      const pubDate = new Date(post.publishedAt);
      const hoursSince = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince <= 48) {
        entry.news = {
          publicationName: new URL(config.baseUrl).hostname,
          publicationLanguage: 'en',
          publicationDate: pubDate.toISOString(),
          title: post.title ?? post.slug,
          keywords: post.seoKeywords,
        };
      }
    }

    entries.push(entry);
  }

  return entries;
}

/** Build sitemap entries for categories. */
export function buildCategoryEntries(
  categories: { slug: string; updatedAt?: Date | string }[],
  config: SitemapConfig,
): SitemapEntry[] {
  return categories.map((cat) => ({
    loc: `${config.baseUrl}/category/${cat.slug}`,
    lastmod: cat.updatedAt
      ? new Date(cat.updatedAt).toISOString()
      : undefined,
    changefreq: 'weekly' as SitemapChangeFrequency,
    priority: SITEMAP_DEFAULTS.CATEGORY_PRIORITY,
  }));
}

/** Build sitemap entries for tags. */
export function buildTagEntries(
  tags: { slug: string; updatedAt?: Date | string }[],
  config: SitemapConfig,
): SitemapEntry[] {
  return tags.map((tag) => ({
    loc: `${config.baseUrl}/tag/${tag.slug}`,
    lastmod: tag.updatedAt
      ? new Date(tag.updatedAt).toISOString()
      : undefined,
    changefreq: 'monthly' as SitemapChangeFrequency,
    priority: SITEMAP_DEFAULTS.TAG_PRIORITY,
  }));
}

/** Build sitemap entries for pages. */
export function buildPageEntries(
  pages: { slug: string; updatedAt?: Date | string }[],
  config: SitemapConfig,
): SitemapEntry[] {
  const excludeSlugs = new Set(config.excludeSlugs ?? []);
  return pages
    .filter((p) => !excludeSlugs.has(p.slug))
    .map((page) => ({
      loc: `${config.baseUrl}/${page.slug}`,
      lastmod: page.updatedAt
        ? new Date(page.updatedAt).toISOString()
        : undefined,
      changefreq: 'monthly' as SitemapChangeFrequency,
      priority: SITEMAP_DEFAULTS.PAGE_PRIORITY,
    }));
}

/** Build sitemap entries for static URLs. */
export function buildStaticEntries(config: SitemapConfig): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // Homepage
  entries.push({
    loc: config.baseUrl,
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: SITEMAP_DEFAULTS.HOMEPAGE_PRIORITY,
  });

  // Custom static URLs
  if (config.staticUrls) {
    for (const staticUrl of config.staticUrls) {
      entries.push({
        loc: `${config.baseUrl}${staticUrl.path}`,
        lastmod: new Date().toISOString(),
        changefreq: staticUrl.changefreq ?? 'monthly',
        priority: staticUrl.priority ?? SITEMAP_DEFAULTS.PAGE_PRIORITY,
      });
    }
  }

  return entries;
}

/* ========================================================================== */
/*  SECTION 4 — Priority Calculation                                          */
/* ========================================================================== */

/**
 * Calculate sitemap priority based on base priority, view count, and recency.
 * Returns a value between 0.0 and 1.0.
 */
export function calculatePriority(
  basePriority: number,
  viewCount?: number,
  updatedAt?: Date | string,
): number {
  let priority = basePriority;

  // Boost based on view count (logarithmic scale)
  if (viewCount && viewCount > 0) {
    const viewBoost = Math.min(0.15, Math.log10(viewCount) * 0.05);
    priority += viewBoost;
  }

  // Boost based on recency (linear decay over 90 days)
  if (updatedAt) {
    const daysSince =
      (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) priority += 0.1;
    else if (daysSince <= 30) priority += 0.05;
    else if (daysSince > 180) priority -= 0.05;
  }

  return Math.min(1.0, Math.max(0.0, Math.round(priority * 10) / 10));
}

/* ========================================================================== */
/*  SECTION 5 — Sitemap Splitting                                             */
/* ========================================================================== */

/**
 * Split a large entry list into chunks respecting the max-entries-per-sitemap limit.
 */
export function splitEntries(
  entries: SitemapEntry[],
  maxPerSitemap: number = SITEMAP_DEFAULTS.MAX_ENTRIES_PER_SITEMAP,
): SitemapEntry[][] {
  const chunks: SitemapEntry[][] = [];
  for (let i = 0; i < entries.length; i += maxPerSitemap) {
    chunks.push(entries.slice(i, i + maxPerSitemap));
  }
  return chunks;
}

/* ========================================================================== */
/*  SECTION 6 — Sitemap Stats                                                 */
/* ========================================================================== */

/** Compute statistics for a set of sitemap entries. */
export function computeSitemapStats(
  entries: SitemapEntry[],
  config: SitemapConfig,
): SitemapStats {
  const byType: Record<string, number> = {};

  for (const entry of entries) {
    let type = 'other';
    const path = entry.loc.replace(config.baseUrl, '');
    if (path === '' || path === '/') type = 'homepage';
    else if (path.startsWith('/blog/')) type = 'post';
    else if (path.startsWith('/category/')) type = 'category';
    else if (path.startsWith('/tag/')) type = 'tag';
    else if (path.startsWith('/author/')) type = 'author';
    else type = 'page';
    byType[type] = (byType[type] ?? 0) + 1;
  }

  const xml = generateSitemapXml(entries);

  return {
    totalUrls: entries.length,
    byType,
    lastGenerated: new Date().toISOString(),
    sizeBytes: new TextEncoder().encode(xml).length,
  };
}

/* ========================================================================== */
/*  SECTION 7 — XSL Stylesheet Accessors                                      */
/* ========================================================================== */

/** Return the XSL stylesheet for urlset sitemaps. */
export function getSitemapXsl(): string {
  return SITEMAP_XSL;
}

/** Return the XSL stylesheet for sitemap index files. */
export function getSitemapIndexXsl(): string {
  return SITEMAP_INDEX_XSL;
}

/* ========================================================================== */
/*  SECTION 8 — Config Parser/Normalizer                                      */
/* ========================================================================== */

/**
 * Parse and normalise a sitemap configuration, filling defaults.
 */
export function normalizeSitemapConfig(
  input: Partial<SitemapConfig> & { baseUrl: string },
): SitemapConfig {
  let baseUrl = input.baseUrl;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  return {
    baseUrl,
    includePages: input.includePages ?? true,
    includePosts: input.includePosts ?? true,
    includeCategories: input.includeCategories ?? true,
    includeTags: input.includeTags ?? true,
    includeAuthors: input.includeAuthors ?? false,
    includeImages: input.includeImages ?? false,
    includeNews: input.includeNews ?? false,
    customUrls: input.customUrls ?? [],
    excludeSlugs: input.excludeSlugs ?? [],
    maxEntriesPerSitemap:
      input.maxEntriesPerSitemap ?? SITEMAP_DEFAULTS.MAX_ENTRIES_PER_SITEMAP,
    defaultChangeFreq:
      input.defaultChangeFreq ?? SITEMAP_DEFAULTS.DEFAULT_CHANGE_FREQ,
    defaultPriority:
      input.defaultPriority ?? SITEMAP_DEFAULTS.DEFAULT_PRIORITY,
    staticUrls: input.staticUrls ?? [],
  };
}
