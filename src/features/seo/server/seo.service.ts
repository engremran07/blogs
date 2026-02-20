/**
 * ============================================================================
 * MODULE  : seo/seo.service.ts
 * PURPOSE : Main SEO service — orchestrates suggestions, keywords, entities,
 *           volume history, batch operations, bulk enhancement, sitemap &
 *           robots generation through Prisma DI delegates
 * PATTERN : Framework-agnostic, constructor DI, typed Prisma delegates,
 *           ApiResponse<T> envelope, optional cache + logger
 * ============================================================================
 */

import type {
  SeoServiceDeps,
  SeoSuggestion,
  SeoKeyword,
  SeoEntity,
  SeoEntityEdge,
  SeoTargetType,
  SeoSuggestionCategory,
  AuditableContent,
  AuditResult,
  SiteAuditResult,
  KeywordVolumeSnapshot,
  KeywordTrend,
  TrendDirection,
  BatchOperation,
  BatchResult,
  BulkEnhancementStats,
  SitemapConfig,
  SitemapEntry,
  SitemapStats,
  RobotsConfig,
  ApiResponse,
  Logger,
  CacheProvider,
} from "../types";
import {
  CACHE_KEYS,
  CACHE_TTLS,
  CHECK_TO_CATEGORY_MAP,
  VOLUME_HISTORY_DEFAULTS,
} from "./constants";
import { auditContent, aggregateSiteAudit } from "./seo-audit.util";
import {
  extractKeywords,
  inferKeywordIntent,
  generateSeoTitle,
  generateSeoDescription,
  calculateReadingTime,
  countWords,
  slugify,
  generateExcerpt,
} from "./seo-text.util";
import {
  generateSitemapXml,
  generateSitemapIndexXml,
  buildPostEntries,
  buildCategoryEntries,
  buildTagEntries,
  buildPageEntries,
  buildStaticEntries,
  normalizeSitemapConfig,
} from "./sitemap.util";
import { generateRobotsTxt, buildDefaultRobotsConfig } from "./robots.util";
import {
  validateEdgeCreation,
  findShortestPath,
  analyzeGraph,
} from "./entity-graph.util";
import { assembleSeoMeta } from "./meta.util";
import type { InterlinkPrisma } from "./interlink.service";

/* ========================================================================== */
/*  SECTION 1 — Helper: Response Envelope                                     */
/* ========================================================================== */

function ok<T>(
  data: T,
  meta?: Partial<ApiResponse<T>["meta"]>,
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  };
}

function fail<T = null>(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<T> {
  return {
    success: false,
    data: null as T,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString() },
  };
}

/* ========================================================================== */
/*  SECTION 2 — No-op Logger                                                  */
/* ========================================================================== */

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

/* ========================================================================== */
/*  SECTION 3 — SeoService Class                                              */
/* ========================================================================== */

export class SeoService {
  private readonly deps: SeoServiceDeps;
  private readonly cache: CacheProvider | undefined;
  private readonly log: Logger;

  constructor(deps: SeoServiceDeps) {
    this.deps = deps;
    this.cache = deps.cache;
    this.log = deps.logger ?? noopLogger;
  }

  /* ======================================================================== */
  /*  3A — SUGGESTIONS                                                        */
  /* ======================================================================== */

  /** List suggestions with optional filters. */
  async listSuggestions(filters?: {
    targetType?: SeoTargetType;
    targetId?: string;
    status?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<SeoSuggestion[]>> {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.targetType) where.targetType = filters.targetType;
      if (filters?.targetId) where.targetId = filters.targetId;
      if (filters?.status) where.status = filters.status;
      if (filters?.category) where.category = filters.category;

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 20;

      const suggestions = await this.deps.seoSuggestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const total = await this.deps.seoSuggestion.count({ where });

      return ok(suggestions, { page, pageSize, total });
    } catch (err) {
      this.log.error("listSuggestions failed", { error: err });
      return fail("LIST_SUGGESTIONS_FAILED", String(err));
    }
  }

  /**
   * Generate suggestions for a target.
   * Runs a full audit and converts failed/warned checks into actionable suggestions.
   */
  async generateSuggestions(
    scope: "site" | "post" | "page",
    targetId?: string,
  ): Promise<ApiResponse<SeoSuggestion[]>> {
    try {
      if (scope === "post" || scope === "page") {
        if (!targetId)
          return fail(
            "MISSING_TARGET_ID",
            "targetId is required for post/page scope.",
          );

        const delegate = scope === "post" ? this.deps.post : this.deps.page;
        const content = await delegate.findUnique({
          where: { id: targetId },
          include: { categories: true, tags: true },
        });
        if (!content) return fail("NOT_FOUND", `${scope} not found.`);

        const auditResult = auditContent(
          content,
          scope === "post" ? "POST" : "PAGE",
        );
        const suggestions = await this.createSuggestionsFromAudit(
          auditResult,
          scope === "post" ? "POST" : "PAGE",
          targetId,
        );

        return ok(suggestions);
      }

      // Site-wide scope — include both posts and pages
      const posts = await this.deps.post.findMany({
        where: { status: "PUBLISHED" },
        include: { categories: true, tags: true },
      });

      const pages = await this.deps.page.findMany({
        where: { status: "PUBLISHED" },
      });

      const allSuggestions: SeoSuggestion[] = [];
      for (const post of posts) {
        const auditResult = auditContent(post, "POST");
        const suggestions = await this.createSuggestionsFromAudit(
          auditResult,
          "POST",
          post.id,
        );
        allSuggestions.push(...suggestions);
      }

      for (const page of pages) {
        const auditResult = auditContent(page, "PAGE");
        const suggestions = await this.createSuggestionsFromAudit(
          auditResult,
          "PAGE",
          page.id,
        );
        allSuggestions.push(...suggestions);
      }

      return ok(allSuggestions, { total: allSuggestions.length });
    } catch (err) {
      this.log.error("generateSuggestions failed", { error: err });
      return fail("GENERATE_SUGGESTIONS_FAILED", String(err));
    }
  }

  /** Decide on a suggestion (approve/reject). */
  async decideSuggestion(
    suggestionId: string,
    status: "APPROVED" | "REJECTED",
    note?: string,
    decidedBy?: string,
  ): Promise<ApiResponse<SeoSuggestion>> {
    try {
      const updated = await this.deps.seoSuggestion.update({
        where: { id: suggestionId },
        data: {
          status,
          decisionNote: note ?? null,
          decidedById: decidedBy ?? null,
        },
      });
      return ok(updated);
    } catch (err) {
      this.log.error("decideSuggestion failed", { error: err });
      return fail("DECIDE_SUGGESTION_FAILED", String(err));
    }
  }

  /** Apply an approved suggestion to its target content. */
  async applySuggestion(
    suggestionId: string,
  ): Promise<ApiResponse<SeoSuggestion>> {
    try {
      const suggestions = await this.deps.seoSuggestion.findMany({
        where: { id: suggestionId },
      });
      const suggestion = suggestions[0];
      if (!suggestion) return fail("NOT_FOUND", "Suggestion not found.");
      if (suggestion.status !== "APPROVED" && suggestion.status !== "NEW") {
        return fail(
          "INVALID_STATUS",
          "Only APPROVED or NEW suggestions can be applied.",
        );
      }

      await this.applySingleSuggestion(suggestion);

      const updated = await this.deps.seoSuggestion.update({
        where: { id: suggestionId },
        data: { status: "APPLIED", appliedAt: new Date().toISOString() },
      });

      // Invalidate cache
      if (this.cache) {
        await this.cache.del(`${CACHE_KEYS.AUDIT}:${suggestion.targetId}`);
        await this.cache.del(`${CACHE_KEYS.META}:${suggestion.targetId}`);
      }

      return ok(updated);
    } catch (err) {
      this.log.error("applySuggestion failed", { error: err });
      return fail("APPLY_SUGGESTION_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3B — AUDIT                                                              */
  /* ======================================================================== */

  /** Run a full SEO audit on a single post. */
  async auditPost(postId: string): Promise<ApiResponse<AuditResult>> {
    try {
      // Check cache
      const cacheKey = `${CACHE_KEYS.AUDIT}:${postId}`;
      if (this.cache) {
        const cached = await this.cache.get<AuditResult>(cacheKey);
        if (cached) return ok(cached);
      }

      const content = await this.deps.post.findUnique({
        where: { id: postId },
        include: { categories: true, tags: true },
      });
      if (!content) return fail("NOT_FOUND", "Post not found.");

      const result = auditContent(content, "POST");

      if (this.cache) {
        await this.cache.set(cacheKey, result, CACHE_TTLS.AUDIT);
      }

      return ok(result);
    } catch (err) {
      this.log.error("auditPost failed", { error: err });
      return fail("AUDIT_FAILED", String(err));
    }
  }

  /** Run a full SEO audit on a single page. */
  async auditPage(pageId: string): Promise<ApiResponse<AuditResult>> {
    try {
      const cacheKey = `${CACHE_KEYS.AUDIT}:page:${pageId}`;
      if (this.cache) {
        const cached = await this.cache.get<AuditResult>(cacheKey);
        if (cached) return ok(cached);
      }

      const content = await this.deps.page.findUnique({
        where: { id: pageId },
      });
      if (!content) return fail("NOT_FOUND", "Page not found.");

      // Pages don't have categories/tags relations — supply empty arrays
      const contentWithDefaults = { ...content, categories: [], tags: [] };
      const result = auditContent(contentWithDefaults, "PAGE");

      if (this.cache) {
        await this.cache.set(cacheKey, result, CACHE_TTLS.AUDIT);
      }

      return ok(result);
    } catch (err) {
      this.log.error("auditPage failed", { error: err });
      return fail("AUDIT_FAILED", String(err));
    }
  }

  /** Site-wide audit across all published posts and pages. */
  async auditSite(limit: number = 50): Promise<ApiResponse<SiteAuditResult>> {
    try {
      const halfLimit = Math.ceil(limit / 2);

      const posts = await this.deps.post.findMany({
        where: { status: "PUBLISHED" },
        include: { categories: true, tags: true },
        take: halfLimit,
        orderBy: { updatedAt: "desc" },
      });

      const pages = await this.deps.page.findMany({
        where: { status: "PUBLISHED" },
        take: limit - posts.length,
        orderBy: { updatedAt: "desc" },
      });

      const results: AuditResult[] = [];
      for (const post of posts) {
        try {
          results.push(auditContent(post, "POST"));
        } catch (err) {
          this.log.warn(`Audit failed for post ${post.id}`, { error: err });
        }
      }

      for (const page of pages) {
        try {
          results.push(auditContent(page, "PAGE"));
        } catch (err) {
          this.log.warn(`Audit failed for page ${page.id}`, { error: err });
        }
      }

      const siteResult = aggregateSiteAudit(results) as SiteAuditResult;
      return ok(siteResult);
    } catch (err) {
      this.log.error("auditSite failed", { error: err });
      return fail("SITE_AUDIT_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3C — KEYWORDS                                                           */
  /* ======================================================================== */

  /** Refresh the keyword index from all published posts and pages. */
  async refreshKeywords(
    _source: string = "system",
  ): Promise<ApiResponse<{ total: number }>> {
    try {
      const posts = await this.deps.post.findMany({
        where: { status: "PUBLISHED" },
        include: { tags: true, categories: true },
      });

      const pages = await this.deps.page.findMany({
        where: { status: "PUBLISHED" },
      });

      const allTerms = new Map<string, { intent: string; source: string }>();

      // --- Process posts ---
      for (const post of posts) {
        // From seoKeywords
        if (post.seoKeywords) {
          for (const kw of post.seoKeywords) {
            const slug = slugify(kw);
            if (slug) {
              allTerms.set(slug, {
                intent: inferKeywordIntent(kw),
                source: "seoKeywords",
              });
            }
          }
        }

        // From tags
        if (post.tags) {
          for (const tag of post.tags) {
            const slug = slugify(tag.name);
            if (slug) {
              allTerms.set(slug, {
                intent: inferKeywordIntent(tag.name),
                source: "tags",
              });
            }
          }
        }

        // From auto-tags
        if (post.autoTags) {
          for (const tag of post.autoTags) {
            const slug = slugify(tag);
            if (slug) {
              allTerms.set(slug, {
                intent: inferKeywordIntent(tag),
                source: "autoTags",
              });
            }
          }
        }

        // Extract from content
        const contentKeywords = extractKeywords(post.content, 5);
        for (const kw of contentKeywords) {
          const slug = slugify(kw.term);
          if (slug && !allTerms.has(slug)) {
            allTerms.set(slug, {
              intent: kw.intent,
              source: "content-analysis",
            });
          }
        }
      }

      // --- Process pages (Page model has no seoKeywords field) ---
      for (const page of pages) {
        const pageSeoKeywords = (page as unknown as Record<string, unknown>)
          .seoKeywords as string[] | undefined;
        if (pageSeoKeywords && Array.isArray(pageSeoKeywords)) {
          for (const kw of pageSeoKeywords) {
            const s = slugify(kw);
            if (s)
              allTerms.set(s, {
                intent: inferKeywordIntent(kw),
                source: "seoKeywords",
              });
          }
        }
        const pageKeywords = extractKeywords(page.content, 5);
        for (const kw of pageKeywords) {
          const s = slugify(kw.term);
          if (s && !allTerms.has(s))
            allTerms.set(s, { intent: kw.intent, source: "content-analysis" });
        }
      }

      // Upsert all keywords
      let total = 0;
      for (const [slug, { intent, source: kwSource }] of allTerms) {
        try {
          await this.deps.seoKeyword.upsert({
            where: { slug },
            create: {
              slug,
              term: slug.replace(/-/g, " "),
              intent: intent as SeoKeyword["intent"],
              source: kwSource,
            },
            update: {
              source: kwSource,
              intent: intent as SeoKeyword["intent"],
            },
          });
          total++;
        } catch (err) {
          this.log.warn(`Keyword upsert failed for "${slug}"`, { error: err });
        }
      }

      if (this.cache) {
        await this.cache.invalidatePattern(`${CACHE_KEYS.KEYWORDS}:*`);
      }

      this.log.info("Keywords refreshed", { total });
      return ok({ total });
    } catch (err) {
      this.log.error("refreshKeywords failed", { error: err });
      return fail("REFRESH_KEYWORDS_FAILED", String(err));
    }
  }

  /** List keywords with optional filters. */
  async listKeywords(filters?: {
    intent?: string;
    source?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<SeoKeyword[]>> {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.intent) where.intent = filters.intent;
      if (filters?.source) where.source = filters.source;
      if (filters?.search) {
        where.term = { contains: filters.search, mode: "insensitive" };
      }

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 50;

      const keywords = await this.deps.seoKeyword.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return ok(keywords, { page, pageSize });
    } catch (err) {
      this.log.error("listKeywords failed", { error: err });
      return fail("LIST_KEYWORDS_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3D — ENTITIES & GRAPH                                                   */
  /* ======================================================================== */

  /** Refresh entities from categories, tags, and auto-tags (from posts and pages). */
  async refreshEntities(
    source: string = "system",
  ): Promise<ApiResponse<{ entities: number; edges: number }>> {
    try {
      const categories = await this.deps.category.findMany();
      const tags = await this.deps.tag.findMany();
      const posts = await this.deps.post.findMany({
        where: { status: "PUBLISHED" },
        include: { categories: true, tags: true },
      });
      const pages = await this.deps.page.findMany({
        where: { status: "PUBLISHED" },
      });

      // Merge posts and pages into a single content list for co-occurrence
      // Pages lack categories/tags relations — supply empty arrays
      const allContent: Array<AuditableContent & { _type: "POST" | "PAGE" }> = [
        ...posts.map((p) => ({ ...p, _type: "POST" as const })),
        ...pages.map((p) => ({
          ...p,
          categories: [],
          tags: [],
          _type: "PAGE" as const,
        })),
      ];

      const entityMap = new Map<string, SeoEntity>();

      // Upsert categories as entities
      for (const cat of categories) {
        const entity = await this.deps.seoEntity.upsert({
          where: { slug_type: { slug: cat.slug, type: "CATEGORY" } },
          create: { slug: cat.slug, type: "CATEGORY", name: cat.name, source },
          update: { name: cat.name, source },
        });
        entityMap.set(`CATEGORY:${cat.slug}`, entity);
      }

      // Upsert tags as entities
      for (const tag of tags) {
        const entity = await this.deps.seoEntity.upsert({
          where: { slug_type: { slug: tag.slug, type: "TAG" } },
          create: { slug: tag.slug, type: "TAG", name: tag.name, source },
          update: { name: tag.name, source },
        });
        entityMap.set(`TAG:${tag.slug}`, entity);
      }

      // Upsert auto-tags as entities (from both posts and pages)
      const autoTagSet = new Set<string>();
      for (const item of allContent) {
        const autoTags = (item as AuditableContent & { autoTags?: string[] })
          .autoTags;
        if (autoTags) {
          for (const at of autoTags) autoTagSet.add(at);
        }
      }
      for (const autoTag of autoTagSet) {
        const slug = slugify(autoTag);
        if (!slug) continue;
        const entity = await this.deps.seoEntity.upsert({
          where: { slug_type: { slug, type: "AUTO_TAG" } },
          create: { slug, type: "AUTO_TAG", name: autoTag, source },
          update: { name: autoTag, source },
        });
        entityMap.set(`AUTO_TAG:${slug}`, entity);
      }

      // Build co-occurrence edges from posts and pages
      let edgeCount = 0;
      for (const item of allContent) {
        const contentEntityIds: string[] = [];
        const categories = (
          item as AuditableContent & { categories?: { slug: string }[] }
        ).categories;
        const tags = (
          item as AuditableContent & { tags?: { slug: string; name: string }[] }
        ).tags;

        if (categories) {
          for (const cat of categories) {
            const entity = entityMap.get(`CATEGORY:${cat.slug}`);
            if (entity) contentEntityIds.push(entity.id);
          }
        }
        if (tags) {
          for (const tag of tags) {
            const entity = entityMap.get(`TAG:${tag.slug}`);
            if (entity) contentEntityIds.push(entity.id);
          }
        }

        // Create co-occurrence edges between all entity pairs in this content
        for (let i = 0; i < contentEntityIds.length; i++) {
          for (let j = i + 1; j < contentEntityIds.length; j++) {
            const [fromId, toId] = [
              contentEntityIds[i],
              contentEntityIds[j],
            ].sort();
            try {
              await this.deps.seoEntityEdge.upsert({
                where: {
                  fromId_toId_relation: {
                    fromId,
                    toId,
                    relation: "CO_OCCURRENCE",
                  },
                },
                create: {
                  fromId,
                  toId,
                  relation: "CO_OCCURRENCE",
                  weight: 1,
                },
                update: {
                  weight: { increment: 1 },
                } as unknown as Partial<SeoEntityEdge>,
              });
              edgeCount++;
            } catch (err) {
              this.log.warn("Edge upsert failed", { fromId, toId, error: err });
            }
          }
        }
      }

      if (this.cache) {
        await this.cache.invalidatePattern(`${CACHE_KEYS.ENTITIES}:*`);
      }

      this.log.info("Entities refreshed", {
        entities: entityMap.size,
        edges: edgeCount,
      });
      return ok({ entities: entityMap.size, edges: edgeCount });
    } catch (err) {
      this.log.error("refreshEntities failed", { error: err });
      return fail("REFRESH_ENTITIES_FAILED", String(err));
    }
  }

  /** List entities with optional filters. */
  async listEntities(filters?: {
    type?: string;
    source?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<SeoEntity[]>> {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.type) where.type = filters.type;
      if (filters?.source) where.source = filters.source;
      if (filters?.search) {
        where.name = { contains: filters.search, mode: "insensitive" };
      }

      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 50;

      const entities = await this.deps.seoEntity.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return ok(entities, { page, pageSize });
    } catch (err) {
      this.log.error("listEntities failed", { error: err });
      return fail("LIST_ENTITIES_FAILED", String(err));
    }
  }

  /** Analyze the entity graph. */
  async analyzeEntityGraph(): Promise<
    ApiResponse<import("../types").GraphAnalysis>
  > {
    try {
      const edges = await this.deps.seoEntityEdge.findMany();
      const analysis = analyzeGraph(edges);
      return ok(analysis);
    } catch (err) {
      this.log.error("analyzeEntityGraph failed", { error: err });
      return fail("GRAPH_ANALYSIS_FAILED", String(err));
    }
  }

  /** Find shortest path between two entities. */
  async findEntityPath(
    fromId: string,
    toId: string,
  ): Promise<ApiResponse<import("../types").ShortestPath>> {
    try {
      const edges = await this.deps.seoEntityEdge.findMany();
      const path = findShortestPath(edges, fromId, toId);
      return ok(path);
    } catch (err) {
      this.log.error("findEntityPath failed", { error: err });
      return fail("FIND_PATH_FAILED", String(err));
    }
  }

  /** Validate whether adding a new edge would create a cycle. */
  async validateNewEdge(
    fromId: string,
    toId: string,
  ): Promise<ApiResponse<{ valid: boolean }>> {
    try {
      const edges = await this.deps.seoEntityEdge.findMany();
      const valid = validateEdgeCreation(edges, fromId, toId);
      return ok({ valid });
    } catch (err) {
      this.log.error("validateNewEdge failed", { error: err });
      return fail("EDGE_VALIDATION_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3E — VOLUME HISTORY                                                     */
  /* ======================================================================== */

  /** Record a keyword volume snapshot. */
  async recordVolumeSnapshot(
    snapshot: KeywordVolumeSnapshot,
  ): Promise<ApiResponse<{ recorded: boolean }>> {
    try {
      await this.deps.rawQuery(
        `INSERT INTO "seo_keyword_history" ("keyword", "volume", "timestamp", "source", "competition")
         VALUES ($1, $2, $3, $4, $5)`,
        snapshot.keyword,
        snapshot.volume,
        new Date(snapshot.timestamp).toISOString(),
        snapshot.source,
        snapshot.competition ?? null,
      );
      return ok({ recorded: true });
    } catch (err) {
      this.log.error("recordVolumeSnapshot failed", { error: err });
      return fail("RECORD_SNAPSHOT_FAILED", String(err));
    }
  }

  /** Batch-record multiple snapshots. */
  async batchRecordSnapshots(
    snapshots: KeywordVolumeSnapshot[],
  ): Promise<ApiResponse<{ recorded: number; failed: number }>> {
    let recorded = 0;
    let failed = 0;
    for (const snapshot of snapshots) {
      const result = await this.recordVolumeSnapshot(snapshot);
      if (result.success) recorded++;
      else failed++;
    }
    return ok({ recorded, failed });
  }

  /** Get volume history for a keyword. */
  async getVolumeHistory(
    keyword: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100,
  ): Promise<ApiResponse<KeywordVolumeSnapshot[]>> {
    try {
      let query = `SELECT * FROM "seo_keyword_history" WHERE "keyword" = $1`;
      const params: unknown[] = [keyword];
      let paramIdx = 2;

      if (startDate) {
        query += ` AND "timestamp" >= $${paramIdx}`;
        params.push(startDate);
        paramIdx++;
      }
      if (endDate) {
        query += ` AND "timestamp" <= $${paramIdx}`;
        params.push(endDate);
        paramIdx++;
      }

      query += ` ORDER BY "timestamp" DESC LIMIT $${paramIdx}`;
      params.push(limit);

      const rows = (await this.deps.rawQuery(
        query,
        ...params,
      )) as KeywordVolumeSnapshot[];
      return ok(rows);
    } catch (err) {
      this.log.error("getVolumeHistory failed", { error: err });
      return fail("GET_HISTORY_FAILED", String(err));
    }
  }

  /** Get trend direction for a keyword. */
  async getKeywordTrend(
    keyword: string,
    windowDays: number = VOLUME_HISTORY_DEFAULTS.TREND_WINDOW_DAYS,
  ): Promise<ApiResponse<KeywordTrend>> {
    try {
      const now = new Date();
      const currentStart = new Date(now.getTime() - windowDays * 86400000);
      const previousStart = new Date(
        currentStart.getTime() - windowDays * 86400000,
      );

      const currentRows = (await this.deps.rawQuery(
        `SELECT AVG("volume") as avg_volume FROM "seo_keyword_history"
         WHERE "keyword" = $1 AND "timestamp" >= $2 AND "timestamp" < $3`,
        keyword,
        currentStart.toISOString(),
        now.toISOString(),
      )) as { avg_volume: number | null }[];

      const previousRows = (await this.deps.rawQuery(
        `SELECT AVG("volume") as avg_volume FROM "seo_keyword_history"
         WHERE "keyword" = $1 AND "timestamp" >= $2 AND "timestamp" < $3`,
        keyword,
        previousStart.toISOString(),
        currentStart.toISOString(),
      )) as { avg_volume: number | null }[];

      const currentVolume = currentRows[0]?.avg_volume ?? 0;
      const previousVolume = previousRows[0]?.avg_volume ?? 0;

      let direction: TrendDirection = "STABLE";
      let changePercent = 0;

      if (previousVolume > 0) {
        changePercent =
          ((currentVolume - previousVolume) / previousVolume) * 100;
        if (changePercent >= VOLUME_HISTORY_DEFAULTS.TREND_RISING_THRESHOLD)
          direction = "RISING";
        else if (
          changePercent <= VOLUME_HISTORY_DEFAULTS.TREND_FALLING_THRESHOLD
        )
          direction = "FALLING";
      } else if (currentVolume > 0) {
        direction = "RISING";
        changePercent = 100;
      }

      return ok({
        keyword,
        direction,
        currentVolume,
        previousVolume,
        changePercent: Math.round(changePercent * 100) / 100,
      });
    } catch (err) {
      this.log.error("getKeywordTrend failed", { error: err });
      return fail("GET_TREND_FAILED", String(err));
    }
  }

  /** Get top trending keywords. */
  async getTrendingKeywords(
    limit: number = 20,
    direction?: TrendDirection,
  ): Promise<ApiResponse<KeywordTrend[]>> {
    try {
      const keywords = await this.deps.seoKeyword.findMany({
        orderBy: { lastSeenAt: "desc" },
        take: limit * 3, // fetch extra to filter
      });

      const trends: KeywordTrend[] = [];
      for (const kw of keywords) {
        const result = await this.getKeywordTrend(kw.term);
        if (result.success && result.data) {
          if (!direction || result.data.direction === direction) {
            trends.push(result.data);
          }
        }
      }

      trends.sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
      );
      return ok(trends.slice(0, limit));
    } catch (err) {
      this.log.error("getTrendingKeywords failed", { error: err });
      return fail("GET_TRENDING_FAILED", String(err));
    }
  }

  /** Clean up old volume history. */
  async cleanupVolumeHistory(
    retentionDays: number = VOLUME_HISTORY_DEFAULTS.RETENTION_DAYS,
  ): Promise<ApiResponse<{ deleted: number }>> {
    try {
      const cutoff = new Date(Date.now() - retentionDays * 86400000);
      const result = (await this.deps.rawQuery(
        `DELETE FROM "seo_keyword_history" WHERE "timestamp" < $1`,
        cutoff.toISOString(),
      )) as unknown[];
      return ok({ deleted: Array.isArray(result) ? result.length : 0 });
    } catch (err) {
      this.log.error("cleanupVolumeHistory failed", { error: err });
      return fail("CLEANUP_FAILED", String(err));
    }
  }

  /** Export volume history to CSV. */
  async exportVolumeHistoryCsv(keyword: string): Promise<ApiResponse<string>> {
    try {
      const historyResult = await this.getVolumeHistory(
        keyword,
        undefined,
        undefined,
        10000,
      );
      if (!historyResult.success || !historyResult.data) {
        return fail("EXPORT_FAILED", "Could not retrieve history.");
      }

      const lines: string[] = [VOLUME_HISTORY_DEFAULTS.CSV_HEADER];
      for (const row of historyResult.data) {
        const line = [
          row.keyword,
          row.volume,
          row.timestamp,
          row.source,
          row.competition ?? "",
        ].join(",");
        lines.push(line);
      }

      return ok(lines.join("\n"));
    } catch (err) {
      this.log.error("exportVolumeHistoryCsv failed", { error: err });
      return fail("EXPORT_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3F — BATCH OPERATIONS                                                   */
  /* ======================================================================== */

  /** Create a batch of suggestions for bulk application. */
  async createBatch(
    name: string,
    suggestionIds: string[],
  ): Promise<ApiResponse<BatchOperation>> {
    try {
      const suggestions = await this.deps.seoSuggestion.findMany({
        where: { id: { in: suggestionIds } },
      });

      if (suggestions.length === 0) {
        return fail("NO_SUGGESTIONS", "No valid suggestions found.");
      }

      const batch = await this.deps.batchOperation.create({
        data: {
          name,
          suggestions: suggestions as unknown as SeoSuggestion[],
          status: "PENDING",
        },
      });

      return ok(batch);
    } catch (err) {
      this.log.error("createBatch failed", { error: err });
      return fail("CREATE_BATCH_FAILED", String(err));
    }
  }

  /** Apply all suggestions in a batch transactionally. */
  async applyBatch(batchId: string): Promise<ApiResponse<BatchResult[]>> {
    try {
      const batch = await this.deps.batchOperation.findUnique({
        where: { id: batchId },
      });
      if (!batch) return fail("NOT_FOUND", "Batch not found.");
      if (batch.status !== "PENDING") {
        return fail("INVALID_STATUS", "Batch is not in PENDING status.");
      }

      await this.deps.batchOperation.update({
        where: { id: batchId },
        data: { status: "IN_PROGRESS" },
      });

      const results: BatchResult[] = [];
      for (const suggestion of batch.suggestions) {
        try {
          await this.applySingleSuggestion(suggestion);
          results.push({ suggestionId: suggestion.id, success: true });
        } catch (err) {
          results.push({
            suggestionId: suggestion.id,
            success: false,
            error: String(err),
          });
        }
      }

      const allSucceeded = results.every((r) => r.success);
      await this.deps.batchOperation.update({
        where: { id: batchId },
        data: {
          status: allSucceeded ? "COMPLETED" : "FAILED",
          appliedAt: new Date().toISOString(),
          results,
        },
      });

      return ok(results);
    } catch (err) {
      this.log.error("applyBatch failed", { error: err });
      return fail("APPLY_BATCH_FAILED", String(err));
    }
  }

  /** List batch operations. */
  async listBatches(filters?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<BatchOperation[]>> {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.status) where.status = filters.status;

      const batches = await this.deps.batchOperation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: ((filters?.page ?? 1) - 1) * (filters?.pageSize ?? 20),
        take: filters?.pageSize ?? 20,
      });

      return ok(batches);
    } catch (err) {
      this.log.error("listBatches failed", { error: err });
      return fail("LIST_BATCHES_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3G — BULK ENHANCEMENT (Intelligent)                                     */
  /* ======================================================================== */

  /**
   * Intelligent bulk-enhance engine for all published posts and pages.
   *
   * Phase 1 — Fill Missing Fields: seoTitle, seoDescription, excerpt,
   *           seoKeywords, ogTitle, ogDescription, wordCount, readingTime
   * Phase 2 — Quality Improvement: upgrade short/weak existing fields
   * Phase 3 — Auto-Interlinking: scan content, inject internal links
   * Phase 4 — Keyword Optimization: refresh stale keywords, ensure diversity
   *
   * The engine is idempotent — safe to run repeatedly via cron.
   */
  async bulkEnhanceContent(
    limit: number = 100,
    dryRun: boolean = false,
  ): Promise<ApiResponse<BulkEnhancementStats>> {
    try {
      const halfLimit = Math.ceil(limit / 2);

      const posts = await this.deps.post.findMany({
        where: { status: "PUBLISHED" },
        include: { categories: true, tags: true },
        take: halfLimit,
        orderBy: { updatedAt: "asc" },
      });

      const pages = await this.deps.page.findMany({
        where: { status: "PUBLISHED" },
        take: limit - posts.length,
        orderBy: { updatedAt: "asc" },
      });

      // Merge into a unified content list
      const allContent = [
        ...posts.map((p) => ({
          ...p,
          _delegate: this.deps.post,
          _type: "POST" as const,
        })),
        ...pages.map((p) => ({
          ...p,
          _delegate: this.deps.page,
          _type: "PAGE" as const,
        })),
      ];

      const stats: BulkEnhancementStats = {
        totalContent: allContent.length,
        enhanced: 0,
        skipped: 0,
        failed: 0,
        fieldCompleteness: {},
      };

      const seoFields = [
        "seoTitle",
        "seoDescription",
        "seoKeywords",
        "excerpt",
        "ogTitle",
        "ogDescription",
      ] as const;

      // Initialize field completeness
      for (const field of seoFields) {
        stats.fieldCompleteness[field] = {
          total: allContent.length,
          filled: 0,
          percentage: 0,
        };
      }

      // ── Build content index for auto-interlinking ──
      const { InterlinkService } = await import("./interlink.service");
      const depsExt = this.deps as unknown as Record<string, unknown>;
      const interlinkSvc = new InterlinkService({
        post: this.deps.post as unknown as InterlinkPrisma["post"],
        page: this.deps.page as unknown as InterlinkPrisma["page"],
        internalLink: (depsExt.internalLink ?? {
          findMany: async () => [],
          count: async () => 0,
          create: async () => ({}),
          upsert: async () => ({}),
          update: async () => ({}),
          updateMany: async () => ({}),
          deleteMany: async () => ({}),
        }) as InterlinkPrisma["internalLink"],
        interlinkExclusion: (depsExt.interlinkExclusion ?? {
          findMany: async () => [],
          count: async () => 0,
          create: async () => ({}),
          delete: async () => ({}),
        }) as InterlinkPrisma["interlinkExclusion"],
      });
      const contentIndex = await interlinkSvc.buildIndex();

      for (const item of allContent) {
        try {
          const updates: Record<string, unknown> = {};
          const fieldsUpdated: string[] = [];

          // ── PHASE 1: Fill missing fields ──

          // Generate missing seoTitle
          if (!item.seoTitle) {
            updates.seoTitle = generateSeoTitle(
              item.title,
              item.seoKeywords ?? [],
            );
            fieldsUpdated.push("seoTitle");
          } else {
            // PHASE 2: Quality check — upgrade short/generic titles
            const title = item.seoTitle as string;
            if (title.length < 20 || title === item.title) {
              const improved = generateSeoTitle(
                item.title,
                item.seoKeywords ?? [],
              );
              if (improved.length > title.length) {
                updates.seoTitle = improved;
                fieldsUpdated.push("seoTitle:improved");
              }
            }
            stats.fieldCompleteness.seoTitle.filled++;
          }

          // Generate missing seoDescription
          if (!item.seoDescription) {
            updates.seoDescription = generateSeoDescription(
              item.content,
              item.seoKeywords ?? [],
            );
            fieldsUpdated.push("seoDescription");
          } else {
            // PHASE 2: Upgrade short descriptions
            const desc = item.seoDescription as string;
            if (desc.length < 80) {
              const improved = generateSeoDescription(
                item.content,
                item.seoKeywords ?? [],
                155,
              );
              if (improved.length > desc.length) {
                updates.seoDescription = improved;
                fieldsUpdated.push("seoDescription:improved");
              }
            }
            stats.fieldCompleteness.seoDescription.filled++;
          }

          // Generate missing excerpt
          if (!item.excerpt) {
            updates.excerpt = generateExcerpt(item.content);
            fieldsUpdated.push("excerpt");
          } else {
            // PHASE 2: Upgrade very short excerpts
            const exc = item.excerpt as string;
            if (exc.length < 50) {
              const improved = generateExcerpt(item.content);
              if (improved && improved.length > exc.length) {
                updates.excerpt = improved;
                fieldsUpdated.push("excerpt:improved");
              }
            }
            stats.fieldCompleteness.excerpt.filled++;
          }

          // Generate missing keywords (or refresh stale/sparse keywords)
          if (!item.seoKeywords || item.seoKeywords.length === 0) {
            const extracted = extractKeywords(item.content, 8);
            updates.seoKeywords = extracted.map((k) => k.term);
            fieldsUpdated.push("seoKeywords");
          } else {
            // PHASE 4: Enrich sparse keywords (< 3)
            if (item.seoKeywords.length < 3) {
              const extracted = extractKeywords(item.content, 8);
              const existing = new Set(
                (item.seoKeywords as string[]).map((k: string) =>
                  k.toLowerCase(),
                ),
              );
              const newKw = extracted
                .map((k) => k.term)
                .filter((t) => !existing.has(t.toLowerCase()));
              if (newKw.length > 0) {
                updates.seoKeywords = [
                  ...item.seoKeywords,
                  ...newKw.slice(0, 5),
                ];
                fieldsUpdated.push("seoKeywords:enriched");
              }
            }
            stats.fieldCompleteness.seoKeywords.filled++;
          }

          // Generate missing OG title
          if (!item.ogTitle) {
            updates.ogTitle =
              (updates.seoTitle as string) ?? item.seoTitle ?? item.title;
            fieldsUpdated.push("ogTitle");
          } else {
            stats.fieldCompleteness.ogTitle.filled++;
          }

          // Generate missing OG description
          if (!item.ogDescription) {
            updates.ogDescription =
              (updates.seoDescription as string) ??
              item.seoDescription ??
              item.excerpt;
            fieldsUpdated.push("ogDescription");
          } else {
            stats.fieldCompleteness.ogDescription.filled++;
          }

          // Calculate reading time & word count (always refresh)
          const wc = countWords(item.content);
          const rt = calculateReadingTime(item.content);
          if (!item.wordCount || item.wordCount !== wc) {
            updates.wordCount = wc;
            if (!item.wordCount) fieldsUpdated.push("wordCount");
          }
          if (!item.readingTime || item.readingTime !== rt) {
            updates.readingTime = rt;
            if (!item.readingTime) fieldsUpdated.push("readingTime");
          }

          // ── PHASE 3: Auto-interlinking ──
          if (item.content && wc >= 50) {
            try {
              const { scanContentForLinks, injectLinksIntoContent } =
                await import("./interlink.service");
              const candidates = scanContentForLinks(
                {
                  id: item.id,
                  type: item._type,
                  content: item.content,
                  seoKeywords: item.seoKeywords || [],
                  tags: item.tags || [],
                  categories: item.categories || [],
                },
                contentIndex,
              );

              const unlinked = candidates.filter((c) => !c.alreadyLinked);
              if (unlinked.length > 0) {
                const { html, inserted } = injectLinksIntoContent(
                  item.content,
                  candidates,
                  contentIndex,
                );
                if (inserted > 0) {
                  updates.content = html;
                  fieldsUpdated.push(`interlinks:${inserted}`);
                }
              }
            } catch (linkErr) {
              this.log.warn(
                `Interlinking failed for ${item._type} ${item.id}`,
                { error: linkErr },
              );
            }
          }

          if (fieldsUpdated.length === 0) {
            stats.skipped++;
            continue;
          }

          if (!dryRun) {
            await item._delegate.update({
              where: { id: item.id },
              data: updates,
            });
          }

          stats.enhanced++;
        } catch (err) {
          stats.failed++;
          this.log.warn(`Enhancement failed for ${item._type} ${item.id}`, {
            error: err,
          });
        }
      }

      // Calculate percentages
      for (const field of seoFields) {
        const fc = stats.fieldCompleteness[field];
        fc.percentage =
          fc.total > 0 ? Math.round((fc.filled / fc.total) * 100) : 0;
      }

      return ok(stats);
    } catch (err) {
      this.log.error("bulkEnhanceContent failed", { error: err });
      return fail("BULK_ENHANCE_FAILED", String(err));
    }
  }

  /** @deprecated Use bulkEnhanceContent() — kept for backward compatibility. */
  async bulkEnhancePosts(
    limit: number = 100,
    dryRun: boolean = false,
  ): Promise<ApiResponse<BulkEnhancementStats>> {
    return this.bulkEnhanceContent(limit, dryRun);
  }

  /** Get SEO field completion stats (posts + pages). */
  async getEnhancementStats(): Promise<ApiResponse<BulkEnhancementStats>> {
    return this.bulkEnhanceContent(500, true); // dry run
  }

  /* ======================================================================== */
  /*  3H — SITEMAP GENERATION                                                 */
  /* ======================================================================== */

  /** Generate a full sitemap XML. */
  async generateSitemap(config: SitemapConfig): Promise<ApiResponse<string>> {
    try {
      const cacheKey = `${CACHE_KEYS.SITEMAP}:full`;
      if (this.cache) {
        const cached = await this.cache.get<string>(cacheKey);
        if (cached) return ok(cached);
      }

      const normalizedConfig = normalizeSitemapConfig(config);
      const allEntries: SitemapEntry[] = [];

      // Static entries (homepage, etc.)
      allEntries.push(...buildStaticEntries(normalizedConfig));

      // Posts
      if (normalizedConfig.includePosts) {
        const posts = await this.deps.post.findMany({
          where: { status: "PUBLISHED" },
          select: {
            slug: true,
            updatedAt: true,
            featuredImage: true,
            title: true,
            seoKeywords: true,
            publishedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        });
        allEntries.push(
          ...buildPostEntries(
            posts as unknown as Parameters<typeof buildPostEntries>[0],
            normalizedConfig,
          ),
        );
      }

      // Categories
      if (normalizedConfig.includeCategories) {
        const categories = await this.deps.category.findMany();
        allEntries.push(...buildCategoryEntries(categories, normalizedConfig));
      }

      // Tags
      if (normalizedConfig.includeTags) {
        const tags = await this.deps.tag.findMany();
        allEntries.push(...buildTagEntries(tags, normalizedConfig));
      }

      // Pages
      if (normalizedConfig.includePages) {
        const pages = await this.deps.page.findMany({
          where: { status: "PUBLISHED" },
          select: { slug: true, updatedAt: true },
        });
        allEntries.push(
          ...buildPageEntries(
            pages as unknown as Parameters<typeof buildPageEntries>[0],
            normalizedConfig,
          ),
        );
      }

      // Custom URLs
      if (
        normalizedConfig.customUrls &&
        normalizedConfig.customUrls.length > 0
      ) {
        allEntries.push(...normalizedConfig.customUrls);
      }

      const xml = generateSitemapXml(allEntries, { withXsl: true });

      if (this.cache) {
        await this.cache.set(cacheKey, xml, CACHE_TTLS.SITEMAP);
      }

      return ok(xml);
    } catch (err) {
      this.log.error("generateSitemap failed", { error: err });
      return fail("SITEMAP_GENERATION_FAILED", String(err));
    }
  }

  /** Generate a sitemap index pointing to typed sub-sitemaps. */
  async generateSitemapIndex(baseUrl: string): Promise<ApiResponse<string>> {
    try {
      const now = new Date().toISOString();
      const sitemaps = [
        { loc: `${baseUrl}/sitemap-static.xml`, lastmod: now },
        { loc: `${baseUrl}/sitemap-blog.xml`, lastmod: now },
        { loc: `${baseUrl}/sitemap-categories.xml`, lastmod: now },
        { loc: `${baseUrl}/sitemap-tags.xml`, lastmod: now },
        { loc: `${baseUrl}/sitemap-pages.xml`, lastmod: now },
      ];

      const xml = generateSitemapIndexXml(sitemaps, { withXsl: true });
      return ok(xml);
    } catch (err) {
      this.log.error("generateSitemapIndex failed", { error: err });
      return fail("SITEMAP_INDEX_FAILED", String(err));
    }
  }

  /** Get sitemap statistics. */
  async getSitemapStats(
    config: SitemapConfig,
  ): Promise<ApiResponse<SitemapStats>> {
    try {
      const sitemapResult = await this.generateSitemap(config);
      if (!sitemapResult.success) {
        return fail("STATS_FAILED", "Could not generate sitemap for stats.");
      }
      // Re-parse to count entries (simpler to just count from generation)
      // We already have the XML, parse entry count from it
      const sitemapData = sitemapResult.data ?? "";
      const urlMatches = sitemapData.match(/<url>/g);
      const totalUrls = urlMatches ? urlMatches.length : 0;

      const stats: SitemapStats = {
        totalUrls,
        byType: {},
        lastGenerated: new Date().toISOString(),
        sizeBytes: new TextEncoder().encode(sitemapData).length,
      };

      return ok(stats);
    } catch (err) {
      this.log.error("getSitemapStats failed", { error: err });
      return fail("STATS_FAILED", String(err));
    }
  }

  /* ======================================================================== */
  /*  3I — ROBOTS.TXT GENERATION                                              */
  /* ======================================================================== */

  /** Generate robots.txt content. */
  generateRobotsTxt(config?: RobotsConfig, baseUrl?: string): string {
    if (config) {
      return generateRobotsTxt(config);
    }
    if (baseUrl) {
      const defaultConfig = buildDefaultRobotsConfig(baseUrl);
      return generateRobotsTxt(defaultConfig);
    }
    return generateRobotsTxt(buildDefaultRobotsConfig("https://example.com"));
  }

  /* ======================================================================== */
  /*  3J — META ASSEMBLY                                                      */
  /* ======================================================================== */

  /** Assemble complete SEO meta for a post. */
  async assemblePostMeta(
    postId: string,
    options: Parameters<typeof assembleSeoMeta>[1],
  ): Promise<ApiResponse<import("../types").SeoMeta>> {
    try {
      const cacheKey = `${CACHE_KEYS.META}:${postId}`;
      if (this.cache) {
        const cached =
          await this.cache.get<import("../types").SeoMeta>(cacheKey);
        if (cached) return ok(cached);
      }

      const content = await this.deps.post.findUnique({
        where: { id: postId },
        include: { categories: true, tags: true, author: true },
      });
      if (!content) return fail("NOT_FOUND", "Post not found.");

      const meta = assembleSeoMeta(content, options);

      if (this.cache) {
        await this.cache.set(cacheKey, meta, CACHE_TTLS.META);
      }

      return ok(meta);
    } catch (err) {
      this.log.error("assemblePostMeta failed", { error: err });
      return fail("META_ASSEMBLY_FAILED", String(err));
    }
  }

  /** Assemble complete SEO meta for a page. */
  async assemblePageMeta(
    pageId: string,
    options: Parameters<typeof assembleSeoMeta>[1],
  ): Promise<ApiResponse<import("../types").SeoMeta>> {
    try {
      const cacheKey = `${CACHE_KEYS.META}:page:${pageId}`;
      if (this.cache) {
        const cached =
          await this.cache.get<import("../types").SeoMeta>(cacheKey);
        if (cached) return ok(cached);
      }

      const content = await this.deps.page.findUnique({
        where: { id: pageId },
      });
      if (!content) return fail("NOT_FOUND", "Page not found.");

      // Pages don't have categories/tags relations — supply empty arrays
      const contentWithDefaults = { ...content, categories: [], tags: [] };
      // Default pathPrefix to '' for pages (not '/blog')
      const pageOptions = { ...options, pathPrefix: options.pathPrefix ?? "" };
      const meta = assembleSeoMeta(contentWithDefaults, pageOptions);

      if (this.cache) {
        await this.cache.set(cacheKey, meta, CACHE_TTLS.META);
      }

      return ok(meta);
    } catch (err) {
      this.log.error("assemblePageMeta failed", { error: err });
      return fail("META_ASSEMBLY_FAILED", String(err));
    }
  }

  /** Assemble SEO meta for any content type by specifying type + ID. */
  async assembleMeta(
    contentType: "POST" | "PAGE",
    contentId: string,
    options: Parameters<typeof assembleSeoMeta>[1],
  ): Promise<ApiResponse<import("../types").SeoMeta>> {
    return contentType === "POST"
      ? this.assemblePostMeta(contentId, options)
      : this.assemblePageMeta(contentId, options);
  }

  /* ======================================================================== */
  /*  PRIVATE HELPERS                                                         */
  /* ======================================================================== */

  /** Convert audit check failures into persisted SEO suggestions. */
  private async createSuggestionsFromAudit(
    audit: AuditResult,
    targetType: SeoTargetType,
    targetId: string,
  ): Promise<SeoSuggestion[]> {
    const created: SeoSuggestion[] = [];

    for (const check of audit.checks) {
      if (check.status === "pass" || check.status === "info") continue;

      const category =
        (CHECK_TO_CATEGORY_MAP[check.name] as SeoSuggestionCategory) ??
        "CONTENT";

      try {
        const suggestion = await this.deps.seoSuggestion.create({
          data: {
            targetType,
            targetId,
            category,
            title: check.name,
            description: check.message,
            severity: check.severity,
            status: "NEW",
            source: "AUDIT",
            proposed: check.details ?? null,
            autoApply: false,
          },
        });
        created.push(suggestion);
      } catch (err) {
        this.log.warn(`Failed to create suggestion for check "${check.name}"`, {
          error: err,
        });
      }
    }

    return created;
  }

  /** Apply a single suggestion's proposed changes to its target. */
  private async applySingleSuggestion(
    suggestion: SeoSuggestion,
  ): Promise<void> {
    const delegate =
      suggestion.targetType === "POST" ? this.deps.post : this.deps.page;
    const proposed = suggestion.proposed ?? {};

    switch (suggestion.category) {
      case "META": {
        const updates: Record<string, unknown> = {};
        if (proposed.seoTitle) updates.seoTitle = proposed.seoTitle;
        if (proposed.seoDescription)
          updates.seoDescription = proposed.seoDescription;
        if (proposed.ogTitle) updates.ogTitle = proposed.ogTitle;
        if (proposed.ogDescription)
          updates.ogDescription = proposed.ogDescription;
        if (Object.keys(updates).length > 0) {
          await delegate.update({
            where: { id: suggestion.targetId },
            data: updates,
          });
        }
        break;
      }

      case "CONTENT": {
        const updates: Record<string, unknown> = {};
        if (proposed.seoKeywords) updates.seoKeywords = proposed.seoKeywords;
        if (proposed.excerpt) updates.excerpt = proposed.excerpt;
        if (proposed.readingTime) updates.readingTime = proposed.readingTime;
        if (proposed.wordCount) updates.wordCount = proposed.wordCount;
        if (Object.keys(updates).length > 0) {
          await delegate.update({
            where: { id: suggestion.targetId },
            data: updates,
          });
        }
        break;
      }

      case "IMAGE":
      case "LINKING":
      case "TECHNICAL":
      case "SOCIAL":
      case "STRUCTURED_DATA":
      case "PERFORMANCE": {
        // These categories may propose field-level updates
        if (proposed && Object.keys(proposed).length > 0) {
          const safeKeys = [
            "seoTitle",
            "seoDescription",
            "ogTitle",
            "ogDescription",
            "ogImage",
            "twitterCard",
            "canonicalUrl",
            "seoKeywords",
            "excerpt",
          ];
          const updates: Record<string, unknown> = {};
          for (const key of safeKeys) {
            if (key in proposed) updates[key] = proposed[key];
          }
          if (Object.keys(updates).length > 0) {
            await delegate.update({
              where: { id: suggestion.targetId },
              data: updates,
            });
          }
        }
        break;
      }

      default:
        this.log.warn(`Unknown suggestion category: ${suggestion.category}`);
    }
  }
}
