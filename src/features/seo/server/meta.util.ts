/**
 * ============================================================================
 * MODULE  : seo/meta.util.ts
 * PURPOSE : Pure meta-tag generation — Open Graph, Twitter Card, canonical,
 *           verification, hreflang, and full SeoMeta assembly
 * PATTERN : Framework-agnostic, zero side-effects
 * ============================================================================
 */

import type {
  AuditableContent,
  SeoMeta,
  OpenGraphMeta,
  TwitterCardMeta,
  VerificationMeta,
} from '../types';
import {
  OG_TITLE_MAX_LENGTH,
  OG_DESCRIPTION_MAX_LENGTH,
  TWITTER_TITLE_MAX_LENGTH,
  TWITTER_DESCRIPTION_MAX_LENGTH,
} from './constants';

/* ========================================================================== */
/*  SECTION 1 — Open Graph Meta Builder                                       */
/* ========================================================================== */

/**
 * Build a complete Open Graph meta object from content.
 * Falls back through seoTitle → title, seoDescription → excerpt, etc.
 */
export function buildOpenGraphMeta(
  content: AuditableContent,
  options?: {
    baseUrl?: string;
    siteName?: string;
    locale?: string;
    defaultImage?: string;
  },
): OpenGraphMeta {
  const title = truncate(
    content.ogTitle ?? content.seoTitle ?? content.title,
    OG_TITLE_MAX_LENGTH,
  );
  const description = truncate(
    content.ogDescription ?? content.seoDescription ?? content.excerpt ?? '',
    OG_DESCRIPTION_MAX_LENGTH,
  );
  const image =
    content.ogImage ?? content.featuredImage ?? options?.defaultImage;
  const url = options?.baseUrl
    ? `${options.baseUrl.replace(/\/$/, '')}/${content.slug}`
    : undefined;

  const og: OpenGraphMeta = {
    title,
    description: description || undefined,
    image: image ?? undefined,
    url,
    type: 'article',
    siteName: options?.siteName,
    locale: options?.locale ?? 'en_US',
  };

  if (content.publishedAt) {
    og.publishedTime = new Date(content.publishedAt).toISOString();
  }
  if (content.updatedAt) {
    og.modifiedTime = new Date(content.updatedAt).toISOString();
  }
  if (content.author?.name) {
    og.author = content.author.name;
  }
  if (content.categories && content.categories.length > 0) {
    og.section = content.categories[0].name;
  }
  if (content.tags && content.tags.length > 0) {
    og.tags = content.tags.map((t) => t.name);
  }

  return og;
}

/* ========================================================================== */
/*  SECTION 2 — Twitter Card Meta Builder                                     */
/* ========================================================================== */

/**
 * Build a Twitter Card meta object from content.
 * Uses summary_large_image when a featured image is available.
 */
export function buildTwitterCardMeta(
  content: AuditableContent,
  options?: {
    site?: string;
    creator?: string;
    defaultImage?: string;
  },
): TwitterCardMeta {
  const image =
    content.ogImage ?? content.featuredImage ?? options?.defaultImage;

  return {
    card: image ? 'summary_large_image' : 'summary',
    site: options?.site,
    creator: options?.creator ?? (content.author?.name ? `@${content.author.name.replace(/\s+/g, '')}` : undefined),
    title: truncate(
      content.ogTitle ?? content.seoTitle ?? content.title,
      TWITTER_TITLE_MAX_LENGTH,
    ),
    description: truncate(
      content.ogDescription ?? content.seoDescription ?? content.excerpt ?? '',
      TWITTER_DESCRIPTION_MAX_LENGTH,
    ) || undefined,
    image: image ?? undefined,
    imageAlt: content.ogImage
      ? content.seoTitle ?? content.title
      : undefined,
  };
}

/* ========================================================================== */
/*  SECTION 3 — Canonical URL Builder                                         */
/* ========================================================================== */

/**
 * Build a canonical URL for content.
 * Prefers an explicitly set canonicalUrl, falls back to baseUrl + slug.
 */
export function buildCanonicalUrl(
  content: AuditableContent,
  baseUrl: string,
  pathPrefix: string = '/blog',
): string {
  if (content.canonicalUrl) {
    // If already absolute, return as-is
    if (/^https?:\/\//i.test(content.canonicalUrl)) {
      return content.canonicalUrl;
    }
    // Relative — prepend baseUrl
    return `${baseUrl.replace(/\/$/, '')}${content.canonicalUrl}`;
  }
  return `${baseUrl.replace(/\/$/, '')}${pathPrefix}/${content.slug}`;
}

/* ========================================================================== */
/*  SECTION 4 — Verification Meta Builder                                     */
/* ========================================================================== */

/**
 * Build verification meta tags from a config object.
 * Returns only non-empty values.
 */
export function buildVerificationMeta(
  config: Partial<VerificationMeta>,
): VerificationMeta {
  const result: VerificationMeta = {};
  if (config.google) result.google = config.google;
  if (config.bing) result.bing = config.bing;
  if (config.yandex) result.yandex = config.yandex;
  if (config.pinterest) result.pinterest = config.pinterest;
  if (config.facebook) result.facebook = config.facebook;
  if (config.norton) result.norton = config.norton;
  if (config.custom && config.custom.length > 0) {
    result.custom = config.custom.filter(
      (c) => c.name && c.content,
    );
  }
  return result;
}

/**
 * Serialise verification meta to an array of { name, content } pairs
 * for easy rendering in <meta> tags.
 */
export function serializeVerificationMeta(
  meta: VerificationMeta,
): { name: string; content: string }[] {
  const tags: { name: string; content: string }[] = [];
  if (meta.google) tags.push({ name: 'google-site-verification', content: meta.google });
  if (meta.bing) tags.push({ name: 'msvalidate.01', content: meta.bing });
  if (meta.yandex) tags.push({ name: 'yandex-verification', content: meta.yandex });
  if (meta.pinterest) tags.push({ name: 'p:domain_verify', content: meta.pinterest });
  if (meta.facebook) tags.push({ name: 'facebook-domain-verification', content: meta.facebook });
  if (meta.norton) tags.push({ name: 'norton-safeweb-site-verification', content: meta.norton });
  if (meta.custom) {
    for (const c of meta.custom) {
      tags.push({ name: c.name, content: c.content });
    }
  }
  return tags;
}

/* ========================================================================== */
/*  SECTION 5 — Hreflang Builder                                              */
/* ========================================================================== */

/**
 * Build hreflang alternate links for multi-language content.
 */
export function buildHreflangLinks(
  slug: string,
  baseUrl: string,
  languages: { code: string; pathPrefix?: string }[],
  pathPrefix: string = '',
): { hreflang: string; href: string }[] {
  const base = baseUrl.replace(/\/$/, '');
  return languages.map((lang) => ({
    hreflang: lang.code,
    href: lang.pathPrefix
      ? `${base}${lang.pathPrefix}${pathPrefix}/${slug}`
      : `${base}${pathPrefix}/${slug}`,
  }));
}

/* ========================================================================== */
/*  SECTION 6 — Robots Meta Directive Builder                                 */
/* ========================================================================== */

/**
 * Build a robots meta content string from directives.
 * E.g. "index, follow, max-snippet:-1, max-image-preview:large"
 */
export function buildRobotsMetaContent(
  options: {
    index?: boolean;
    follow?: boolean;
    noArchive?: boolean;
    noSnippet?: boolean;
    noImageIndex?: boolean;
    maxSnippet?: number;
    maxImagePreview?: 'none' | 'standard' | 'large';
    maxVideoPreview?: number;
    noTranslate?: boolean;
  } = {},
): string {
  const directives: string[] = [];

  directives.push(options.index === false ? 'noindex' : 'index');
  directives.push(options.follow === false ? 'nofollow' : 'follow');

  if (options.noArchive) directives.push('noarchive');
  if (options.noSnippet) directives.push('nosnippet');
  if (options.noImageIndex) directives.push('noimageindex');
  if (options.noTranslate) directives.push('notranslate');
  if (options.maxSnippet !== undefined) directives.push(`max-snippet:${options.maxSnippet}`);
  if (options.maxImagePreview) directives.push(`max-image-preview:${options.maxImagePreview}`);
  if (options.maxVideoPreview !== undefined) directives.push(`max-video-preview:${options.maxVideoPreview}`);

  return directives.join(', ');
}

/* ========================================================================== */
/*  SECTION 7 — Full SeoMeta Assembly                                         */
/* ========================================================================== */

/**
 * Assemble a complete SeoMeta object from content and options.
 * This is the main entry point for generating all meta tags for a page.
 */
export function assembleSeoMeta(
  content: AuditableContent,
  options: {
    baseUrl: string;
    siteName?: string;
    locale?: string;
    twitterSite?: string;
    twitterCreator?: string;
    defaultImage?: string;
    verification?: Partial<VerificationMeta>;
    languages?: { code: string; pathPrefix?: string }[];
    robotsOptions?: Parameters<typeof buildRobotsMetaContent>[0];
    pathPrefix?: string;
    structuredData?: Record<string, unknown>[];
  },
): SeoMeta {
  const pathPrefix = options.pathPrefix ?? '';

  return {
    title: content.seoTitle ?? content.title,
    description: content.seoDescription ?? content.excerpt ?? '',
    keywords: content.seoKeywords ?? [],
    canonicalUrl: buildCanonicalUrl(content, options.baseUrl, pathPrefix),
    robots: options.robotsOptions
      ? buildRobotsMetaContent(options.robotsOptions)
      : 'index, follow',
    og: buildOpenGraphMeta(content, {
      baseUrl: options.baseUrl,
      siteName: options.siteName,
      locale: options.locale,
      defaultImage: options.defaultImage,
    }),
    twitter: buildTwitterCardMeta(content, {
      site: options.twitterSite,
      creator: options.twitterCreator,
      defaultImage: options.defaultImage,
    }),
    verification: options.verification
      ? buildVerificationMeta(options.verification)
      : undefined,
    alternateLanguages: options.languages
      ? buildHreflangLinks(content.slug, options.baseUrl, options.languages, pathPrefix)
      : undefined,
    structuredData: options.structuredData,
  };
}

/* ========================================================================== */
/*  SECTION 8 — Meta Tag Serialization (HTML string output)                   */
/* ========================================================================== */

/** Escape HTML attribute values. */
function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Serialize an SeoMeta object to an array of HTML <meta> tag strings.
 * Includes <link> tags for canonical and hreflang.
 */
export function serializeSeoMetaToHtml(meta: SeoMeta): string[] {
  const tags: string[] = [];

  // Basic meta
  tags.push(`<title>${escapeAttr(meta.title)}</title>`);
  tags.push(`<meta name="description" content="${escapeAttr(meta.description)}">`);
  if (meta.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeAttr(meta.keywords.join(', '))}">`);
  }
  if (meta.robots) {
    tags.push(`<meta name="robots" content="${escapeAttr(meta.robots)}">`);
  }
  if (meta.canonicalUrl) {
    tags.push(`<link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}">`);
  }

  // Open Graph
  if (meta.og) {
    const og = meta.og;
    if (og.title) tags.push(`<meta property="og:title" content="${escapeAttr(og.title)}">`);
    if (og.description) tags.push(`<meta property="og:description" content="${escapeAttr(og.description)}">`);
    if (og.image) tags.push(`<meta property="og:image" content="${escapeAttr(og.image)}">`);
    if (og.imageWidth) tags.push(`<meta property="og:image:width" content="${og.imageWidth}">`);
    if (og.imageHeight) tags.push(`<meta property="og:image:height" content="${og.imageHeight}">`);
    if (og.imageAlt) tags.push(`<meta property="og:image:alt" content="${escapeAttr(og.imageAlt)}">`);
    if (og.url) tags.push(`<meta property="og:url" content="${escapeAttr(og.url)}">`);
    if (og.type) tags.push(`<meta property="og:type" content="${og.type}">`);
    if (og.siteName) tags.push(`<meta property="og:site_name" content="${escapeAttr(og.siteName)}">`);
    if (og.locale) tags.push(`<meta property="og:locale" content="${og.locale}">`);
    if (og.publishedTime) tags.push(`<meta property="article:published_time" content="${og.publishedTime}">`);
    if (og.modifiedTime) tags.push(`<meta property="article:modified_time" content="${og.modifiedTime}">`);
    if (og.author) tags.push(`<meta property="article:author" content="${escapeAttr(og.author)}">`);
    if (og.section) tags.push(`<meta property="article:section" content="${escapeAttr(og.section)}">`);
    if (og.tags) {
      for (const tag of og.tags) {
        tags.push(`<meta property="article:tag" content="${escapeAttr(tag)}">`);
      }
    }
  }

  // Twitter Card
  if (meta.twitter) {
    const tw = meta.twitter;
    if (tw.card) tags.push(`<meta name="twitter:card" content="${tw.card}">`);
    if (tw.site) tags.push(`<meta name="twitter:site" content="${escapeAttr(tw.site)}">`);
    if (tw.creator) tags.push(`<meta name="twitter:creator" content="${escapeAttr(tw.creator)}">`);
    if (tw.title) tags.push(`<meta name="twitter:title" content="${escapeAttr(tw.title)}">`);
    if (tw.description) tags.push(`<meta name="twitter:description" content="${escapeAttr(tw.description)}">`);
    if (tw.image) tags.push(`<meta name="twitter:image" content="${escapeAttr(tw.image)}">`);
    if (tw.imageAlt) tags.push(`<meta name="twitter:image:alt" content="${escapeAttr(tw.imageAlt)}">`);
  }

  // Verification
  if (meta.verification) {
    const verificationTags = serializeVerificationMeta(meta.verification);
    for (const vt of verificationTags) {
      tags.push(`<meta name="${escapeAttr(vt.name)}" content="${escapeAttr(vt.content)}">`);
    }
  }

  // Hreflang
  if (meta.alternateLanguages) {
    for (const alt of meta.alternateLanguages) {
      tags.push(`<link rel="alternate" hreflang="${escapeAttr(alt.hreflang)}" href="${escapeAttr(alt.href)}">`);
    }
  }

  return tags;
}

/* ========================================================================== */
/*  INTERNAL HELPERS                                                          */
/* ========================================================================== */

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).replace(/\s+\S*$/, '') + '...';
}
