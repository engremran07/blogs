/**
 * ============================================================================
 * MODULE  : seo/index.ts
 * PURPOSE : Barrel exports for the complete SEO module
 * ============================================================================
 */

/* ── Types ── */
export type {
  // Enums (union types)
  SeoSuggestionCategory,
  SeoSuggestionSource,
  SeoSuggestionStatus,
  SeoTargetType,
  SeoKeywordIntent,
  AuditSeverity,
  AuditStatus,
  SitemapChangeFrequency,
  SeoEntityType,
  SeoEntityRelation,
  BatchStatus,
  TrendDirection,
  JsonLdType,
  RobotsDirective,
  // Audit
  AuditCheck,
  AuditResult,
  SiteAuditResult,
  AuditableContent,
  // Suggestions
  SeoSuggestion,
  SuggestionDecision,
  // Keywords
  SeoKeyword,
  KeywordAnalysis,
  // Entities
  SeoEntity,
  SeoEntityEdge,
  GraphAnalysis,
  ShortestPath,
  // Volume history
  KeywordVolumeSnapshot,
  KeywordTrend,
  // Batch
  BatchOperation,
  BatchResult,
  // Sitemap
  SitemapEntry,
  SitemapImage,
  SitemapNews,
  SitemapAlternate,
  SitemapConfig,
  SitemapStats,
  // Robots
  RobotsRule,
  RobotsConfig,
  // JSON-LD inputs
  ArticleJsonLdInput,
  EventJsonLdInput,
  WebSiteJsonLdInput,
  WebPageJsonLdInput,
  BreadcrumbItem,
  FaqItem,
  HowToStep,
  HowToJsonLdInput,
  OrganizationJsonLdInput,
  ProductJsonLdInput,
  LocalBusinessJsonLdInput,
  VideoJsonLdInput,
  PersonJsonLdInput,
  // Meta
  SeoMeta,
  OpenGraphMeta,
  TwitterCardMeta,
  VerificationMeta,
  // Quality
  TitleQualityScore,
  BulkEnhancementStats,
  BulkEnhancementResult,
  // API envelope
  ApiResponse,
  // DI deps
  SeoServiceDeps,
  PrismaPostDelegate,
  PrismaPageDelegate,
  PrismaCategoryDelegate,
  PrismaTagDelegate,
  PrismaSeoSuggestionDelegate,
  PrismaSeoKeywordDelegate,
  PrismaSeoEntityDelegate,
  PrismaSeoEntityEdgeDelegate,
  PrismaBatchOperationDelegate,
  PrismaTransactionFn,
  PrismaRawQueryFn,
  CacheProvider,
  Logger,
} from './types';

/* ── Enum const arrays ── */
export {
  SEO_SUGGESTION_CATEGORIES,
  SEO_SUGGESTION_SOURCES,
  SEO_SUGGESTION_STATUSES,
  SEO_TARGET_TYPES,
  SEO_KEYWORD_INTENTS,
  AUDIT_SEVERITIES,
  AUDIT_STATUSES,
  SITEMAP_CHANGE_FREQUENCIES,
  SEO_ENTITY_TYPES,
  SEO_ENTITY_RELATIONS,
  BATCH_STATUSES,
  TREND_DIRECTIONS,
  JSON_LD_TYPES,
  ROBOTS_DIRECTIVES,
} from './types';

/* ── Constants ── */
export {
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_PIXEL_MAX,
  META_DESCRIPTION_MIN_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  OG_TITLE_MAX_LENGTH,
  OG_DESCRIPTION_MAX_LENGTH,
  TWITTER_TITLE_MAX_LENGTH,
  TWITTER_DESCRIPTION_MAX_LENGTH,
  CONTENT_MIN_WORD_COUNT,
  CONTENT_GOOD_WORD_COUNT,
  CONTENT_EXCELLENT_WORD_COUNT,
  KEYWORD_DENSITY_MIN,
  KEYWORD_DENSITY_MAX,
  KEYWORD_DENSITY_IDEAL,
  MAX_KEYWORD_STUFFING_DENSITY,
  READING_TIME_WPM,
  SLUG_MAX_LENGTH,
  SLUG_MAX_WORDS,
  HEADING_MAX_H1,
  HEADING_MIN_H2,
  HEADING_MAX_PER_300_WORDS,
  IMAGE_ALT_MAX_LENGTH,
  IMAGE_TITLE_MAX_LENGTH,
  INTERNAL_LINKS_MIN,
  INTERNAL_LINKS_RECOMMENDED,
  EXTERNAL_LINKS_MIN,
  EXTERNAL_LINKS_MAX,
  CONTENT_STALE_MONTHS,
  CONTENT_REVIEW_MONTHS,
  AUDIT_WEIGHTS,
  AUDIT_SCORE_THRESHOLDS,
  STOP_WORDS,
  POWER_WORDS,
  EMOTIONAL_WORDS,
  INTENT_PATTERNS,
  SITEMAP_DEFAULTS,
  SITEMAP_XSL,
  SITEMAP_INDEX_XSL,
  ROBOTS_DEFAULTS,
  CACHE_KEYS,
  CACHE_TTLS,
  VOLUME_HISTORY_DEFAULTS,
  CHECK_NAMES,
  CHECK_TO_CATEGORY_MAP,
} from './server/constants';

/* ── Schemas (Zod) ── */
export {
  generateSuggestionsSchema,
  decideSuggestionSchema,
  applySuggestionSchema,
  listSuggestionsSchema,
  createSuggestionSchema,
  refreshKeywordsSchema,
  listKeywordsSchema,
  upsertKeywordSchema,
  refreshEntitiesSchema,
  listEntitiesSchema,
  createEdgeSchema,
  shortestPathSchema,
  recordSnapshotSchema,
  batchRecordSnapshotsSchema,
  getHistorySchema,
  getTrendSchema,
  getTrendingKeywordsSchema,
  cleanupHistorySchema,
  createBatchSchema,
  applyBatchSchema,
  listBatchesSchema,
  auditPostSchema,
  auditPageSchema,
  auditSiteSchema,
  bulkEnhanceSchema,
  sitemapConfigSchema,
  robotsConfigSchema,
  seoMetaSchema,
  seoApiBodySchema,
} from './server/schemas';

/* ── Audit utilities ── */
export {
  auditContent,
  generateRecommendations,
  aggregateSiteAudit,
  stripHtml as auditStripHtml,
  countWords as auditCountWords,
  extractHeadings,
  extractImages,
  extractLinks,
} from './server/seo-audit.util';

/* ── Text utilities ── */
export {
  extractKeywords,
  extractKeywordsFromTerms,
  inferKeywordIntent,
  generateSeoTitle,
  generateSeoDescription,
  calculateReadingTime,
  countWords,
  validateSlug,
  scoreTitleQuality,
  generateExcerpt,
  jaccardSimilarity,
  generateNgrams,
  getTopNgrams,
  slugify,
  stripHtml,
  tokenize,
} from './server/seo-text.util';

/* ── Sitemap utilities ── */
export {
  generateSitemapXml,
  generateSitemapIndexXml,
  buildPostEntries,
  buildCategoryEntries,
  buildTagEntries,
  buildPageEntries,
  buildStaticEntries,
  normalizeSitemapConfig,
  splitEntries,
  computeSitemapStats,
  getSitemapXsl,
  getSitemapIndexXsl,
  calculatePriority,
  escapeXml,
} from './server/sitemap.util';

/* ── Entity graph utilities ── */
export {
  detectCycles,
  validateEdgeCreation,
  findShortestPath,
  getReachableNodes,
  findStronglyConnectedComponents,
  analyzeGraph,
  findWeightedShortestPath,
  computeNodeDegrees,
  findHubsAndAuthorities,
  buildAdjacencyList,
  collectNodes,
} from './server/entity-graph.util';

/* ── Robots.txt utilities ── */
export {
  generateRobotsTxt,
  buildDefaultRobotsConfig,
  buildBotSpecificRules,
  buildAiBlockRules,
  validateRobotsConfig,
  parseRobotsTxt,
  AI_SCRAPER_BOTS,
} from './server/robots.util';

/* ── Meta utilities ── */
export {
  buildOpenGraphMeta,
  buildTwitterCardMeta,
  buildCanonicalUrl,
  buildVerificationMeta,
  serializeVerificationMeta,
  buildHreflangLinks,
  buildRobotsMetaContent,
  assembleSeoMeta,
  serializeSeoMetaToHtml,
} from './server/meta.util';

/* ── JSON-LD utilities ── */
export {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildWebSiteJsonLd,
  buildWebPageJsonLd,
  buildFaqJsonLd,
  buildHowToJsonLd,
  buildOrganizationJsonLd,
  buildPersonJsonLd,
  serializeJsonLd,
} from './server/json-ld.util';

/* ── Main Service ── */
export { SeoService } from './server/seo.service';

/* ── Interlinking ── */
export {
  InterlinkService,
  scanContentForLinks,
  injectLinksIntoContent,
  detectBrokenLinks,
} from './server/interlink.service';

export type {
  LinkCandidate,
  InternalLinkRecord,
  InterlinkScanResult,
  InterlinkReport,
} from './server/interlink.service';
