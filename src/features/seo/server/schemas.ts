/**
 * ============================================================================
 * MODULE  : seo/schemas.ts
 * PURPOSE : Zod validation schemas for all SEO operations
 * PATTERN : Framework-agnostic — Zod-only, no framework decorators
 * ============================================================================
 */

import { z } from 'zod';
import {
  SEO_SUGGESTION_CATEGORIES,
  SEO_SUGGESTION_SOURCES,
  SEO_SUGGESTION_STATUSES,
  SEO_TARGET_TYPES,
  SEO_KEYWORD_INTENTS,
  SEO_ENTITY_TYPES,
  SEO_ENTITY_RELATIONS,
  BATCH_STATUSES,
  SITEMAP_CHANGE_FREQUENCIES,
} from '../types';

/* ========================================================================== */
/*  SECTION 1 — Suggestion Schemas                                            */
/* ========================================================================== */

export const generateSuggestionsSchema = z.object({
  scope: z.enum(['site', 'post', 'page']),
  targetId: z.string().uuid().optional(),
});

export const decideSuggestionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).optional(),
  decidedBy: z.string().uuid().optional(),
});

export const applySuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
});

export const listSuggestionsSchema = z.object({
  targetType: z.enum(SEO_TARGET_TYPES).optional(),
  targetId: z.string().uuid().optional(),
  status: z.enum(SEO_SUGGESTION_STATUSES).optional(),
  category: z.enum(SEO_SUGGESTION_CATEGORIES).optional(),
  source: z.enum(SEO_SUGGESTION_SOURCES).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const createSuggestionSchema = z.object({
  targetType: z.enum(SEO_TARGET_TYPES),
  targetId: z.string().uuid(),
  category: z.enum(SEO_SUGGESTION_CATEGORIES),
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(2000),
  severity: z.enum(['CRITICAL', 'IMPORTANT', 'OPTIONAL', 'INFO']),
  source: z.enum(SEO_SUGGESTION_SOURCES).default('MANUAL'),
  proposed: z.record(z.string(), z.unknown()).optional(),
  autoApply: z.boolean().default(false),
  createdById: z.string().uuid().optional(),
});

/* ========================================================================== */
/*  SECTION 2 — Keyword Schemas                                               */
/* ========================================================================== */

export const refreshKeywordsSchema = z.object({
  source: z.string().min(1).max(100).default('system'),
});

export const listKeywordsSchema = z.object({
  intent: z.enum(SEO_KEYWORD_INTENTS).optional(),
  source: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

export const upsertKeywordSchema = z.object({
  slug: z.string().min(1).max(200),
  term: z.string().min(1).max(200),
  intent: z.enum(SEO_KEYWORD_INTENTS),
  source: z.string().min(1).max(100),
  volume: z.number().int().min(0).optional(),
  competition: z.number().min(0).max(1).optional(),
  cpc: z.number().min(0).optional(),
});

/* ========================================================================== */
/*  SECTION 3 — Entity & Graph Schemas                                        */
/* ========================================================================== */

export const refreshEntitiesSchema = z.object({
  source: z.string().min(1).max(100).default('system'),
});

export const listEntitiesSchema = z.object({
  type: z.enum(SEO_ENTITY_TYPES).optional(),
  source: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

export const createEdgeSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
  relation: z.enum(SEO_ENTITY_RELATIONS),
  weight: z.number().min(0).max(100).default(1),
});

export const shortestPathSchema = z.object({
  fromId: z.string().uuid(),
  toId: z.string().uuid(),
});

/* ========================================================================== */
/*  SECTION 4 — Volume History Schemas                                        */
/* ========================================================================== */

export const recordSnapshotSchema = z.object({
  keyword: z.string().min(1).max(200),
  volume: z.number().int().min(0),
  source: z.string().min(1).max(100),
  competition: z.number().min(0).max(1).optional(),
});

export const batchRecordSnapshotsSchema = z.object({
  snapshots: z.array(recordSnapshotSchema).min(1).max(500),
});

export const getHistorySchema = z.object({
  keyword: z.string().min(1).max(200),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
});

export const getTrendSchema = z.object({
  keyword: z.string().min(1).max(200),
  windowDays: z.number().int().min(1).max(90).default(7),
});

export const getTrendingKeywordsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  direction: z.enum(['RISING', 'FALLING', 'STABLE']).optional(),
});

export const cleanupHistorySchema = z.object({
  retentionDays: z.number().int().min(30).max(3650).default(365),
});

/* ========================================================================== */
/*  SECTION 5 — Batch Operation Schemas                                       */
/* ========================================================================== */

export const createBatchSchema = z.object({
  name: z.string().min(1).max(300),
  suggestionIds: z.array(z.string().uuid()).min(1).max(500),
});

export const applyBatchSchema = z.object({
  batchId: z.string().uuid(),
});

export const listBatchesSchema = z.object({
  status: z.enum(BATCH_STATUSES).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

/* ========================================================================== */
/*  SECTION 6 — Audit Schemas                                                 */
/* ========================================================================== */

export const auditPostSchema = z.object({
  postId: z.string().uuid(),
});

export const auditPageSchema = z.object({
  pageId: z.string().uuid(),
});

export const auditSiteSchema = z.object({
  limit: z.number().int().min(1).max(500).default(50),
});

export const bulkEnhanceSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  dryRun: z.boolean().default(false),
});

/* ========================================================================== */
/*  SECTION 7 — Sitemap Schemas                                               */
/* ========================================================================== */

export const sitemapConfigSchema = z.object({
  baseUrl: z.string().url(),
  includePages: z.boolean().default(true),
  includePosts: z.boolean().default(true),
  includeCategories: z.boolean().default(true),
  includeTags: z.boolean().default(true),
  includeAuthors: z.boolean().default(false),
  includeImages: z.boolean().default(false),
  includeNews: z.boolean().default(false),
  customUrls: z
    .array(
      z.object({
        loc: z.string().url(),
        lastmod: z.string().optional(),
        changefreq: z.enum(SITEMAP_CHANGE_FREQUENCIES).optional(),
        priority: z.number().min(0).max(1).optional(),
      }),
    )
    .optional(),
  excludeSlugs: z.array(z.string()).optional(),
  maxEntriesPerSitemap: z.number().int().min(100).max(50000).default(50000),
  defaultChangeFreq: z.enum(SITEMAP_CHANGE_FREQUENCIES).default('weekly'),
  defaultPriority: z.number().min(0).max(1).default(0.5),
  staticUrls: z
    .array(
      z.object({
        path: z.string(),
        priority: z.number().min(0).max(1).optional(),
        changefreq: z.enum(SITEMAP_CHANGE_FREQUENCIES).optional(),
      }),
    )
    .optional(),
});

/* ========================================================================== */
/*  SECTION 8 — Robots.txt Schema                                             */
/* ========================================================================== */

export const robotsConfigSchema = z.object({
  rules: z
    .array(
      z.object({
        userAgent: z.string().min(1),
        allow: z.array(z.string()).optional(),
        disallow: z.array(z.string()).optional(),
        crawlDelay: z.number().min(0).max(120).optional(),
      }),
    )
    .min(1),
  sitemapUrls: z.array(z.string().url()).optional(),
  host: z.string().optional(),
});

/* ========================================================================== */
/*  SECTION 9 — Meta Schema                                                   */
/* ========================================================================== */

export const seoMetaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  keywords: z.array(z.string().max(100)).max(20),
  canonicalUrl: z.string().url().optional(),
  robots: z.string().optional(),
  og: z
    .object({
      title: z.string().max(200).optional(),
      description: z.string().max(500).optional(),
      image: z.string().url().optional(),
      imageWidth: z.number().int().optional(),
      imageHeight: z.number().int().optional(),
      imageAlt: z.string().max(200).optional(),
      url: z.string().url().optional(),
      type: z.enum(['website', 'article', 'profile', 'book']).optional(),
      siteName: z.string().max(200).optional(),
      locale: z.string().max(20).optional(),
      publishedTime: z.string().datetime().optional(),
      modifiedTime: z.string().datetime().optional(),
      author: z.string().max(200).optional(),
      section: z.string().max(200).optional(),
      tags: z.array(z.string().max(100)).optional(),
    })
    .optional(),
  twitter: z
    .object({
      card: z
        .enum(['summary', 'summary_large_image', 'app', 'player'])
        .optional(),
      site: z.string().max(100).optional(),
      creator: z.string().max(100).optional(),
      title: z.string().max(200).optional(),
      description: z.string().max(500).optional(),
      image: z.string().url().optional(),
      imageAlt: z.string().max(200).optional(),
    })
    .optional(),
  verification: z
    .object({
      google: z.string().optional(),
      bing: z.string().optional(),
      yandex: z.string().optional(),
      pinterest: z.string().optional(),
      facebook: z.string().optional(),
      norton: z.string().optional(),
      custom: z
        .array(z.object({ name: z.string(), content: z.string() }))
        .optional(),
    })
    .optional(),
  alternateLanguages: z
    .array(
      z.object({
        hreflang: z.string().min(2).max(10),
        href: z.string().url(),
      }),
    )
    .optional(),
});

/* ========================================================================== */
/*  SECTION 10 — SEO API Route Schema                                         */
/* ========================================================================== */

export const seoApiBodySchema = z.object({
  action: z.enum([
    'generateMeta',
    'audit',
    'bulkAudit',
    'structuredData',
    'generateSuggestions',
    'refreshKeywords',
    'refreshEntities',
  ]),
  postId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  contentType: z.enum(['POST', 'PAGE']).optional(),
  baseUrl: z.string().url().optional(),
  scope: z.enum(['site', 'post', 'page']).optional(),
  targetId: z.string().uuid().optional(),
  options: z
    .object({
      limit: z.number().int().min(1).max(500).optional(),
      dryRun: z.boolean().optional(),
      pathPrefix: z.string().optional(),
    })
    .optional(),
});
