/**
 * ============================================================================
 * MODULE  : seo/types.ts
 * PURPOSE : Comprehensive type definitions for the SEO module
 * SCOPE   : Enums (const-array + union), interfaces, DI contracts
 * PATTERN : Framework-agnostic — no NestJS / Next.js / Express imports
 * ============================================================================
 */

/* ========================================================================== */
/*  SECTION 1 — Enum-like Const Arrays + Union Types                          */
/* ========================================================================== */

/** Suggestion categories for SEO improvements. */
export const SEO_SUGGESTION_CATEGORIES = [
  'META',
  'CONTENT',
  'TECHNICAL',
  'IMAGE',
  'LINKING',
  'STRUCTURED_DATA',
  'SOCIAL',
  'PERFORMANCE',
] as const;
export type SeoSuggestionCategory = (typeof SEO_SUGGESTION_CATEGORIES)[number];

/** Sources that generate SEO suggestions. */
export const SEO_SUGGESTION_SOURCES = [
  'AUDIT',
  'AI',
  'MANUAL',
  'RULE_ENGINE',
] as const;
export type SeoSuggestionSource = (typeof SEO_SUGGESTION_SOURCES)[number];

/** Lifecycle statuses for SEO suggestions. */
export const SEO_SUGGESTION_STATUSES = [
  'NEW',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'APPLIED',
  'EXPIRED',
] as const;
export type SeoSuggestionStatus = (typeof SEO_SUGGESTION_STATUSES)[number];

/** Target types for SEO operations. */
export const SEO_TARGET_TYPES = [
  'POST',
  'PAGE',
  'CATEGORY',
  'TAG',
  'SITE',
] as const;
export type SeoTargetType = (typeof SEO_TARGET_TYPES)[number];

/** Keyword search intents (expanded from source). */
export const SEO_KEYWORD_INTENTS = [
  'INFORMATIONAL',
  'COMMERCIAL',
  'TRANSACTIONAL',
  'LOCAL',
  'NAVIGATIONAL',
  'OTHER',
] as const;
export type SeoKeywordIntent = (typeof SEO_KEYWORD_INTENTS)[number];

/** Audit check severity tiers. */
export const AUDIT_SEVERITIES = [
  'CRITICAL',
  'IMPORTANT',
  'OPTIONAL',
  'INFO',
] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

/** Audit check result status. */
export const AUDIT_STATUSES = ['pass', 'warn', 'fail', 'info'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

/** Sitemap change frequencies per the Sitemaps protocol. */
export const SITEMAP_CHANGE_FREQUENCIES = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
] as const;
export type SitemapChangeFrequency = (typeof SITEMAP_CHANGE_FREQUENCIES)[number];

/** SEO entity classification types. */
export const SEO_ENTITY_TYPES = [
  'CATEGORY',
  'TAG',
  'AUTO_TAG',
  'TOPIC',
  'BRAND',
  'PERSON',
  'LOCATION',
] as const;
export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number];

/** Relation types between SEO entities in the knowledge graph. */
export const SEO_ENTITY_RELATIONS = [
  'CO_OCCURRENCE',
  'HIERARCHY',
  'SYNONYM',
  'RELATED',
  'PARENT_CHILD',
] as const;
export type SeoEntityRelation = (typeof SEO_ENTITY_RELATIONS)[number];

/** Batch operation statuses. */
export const BATCH_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

/** Volume trend directions. */
export const TREND_DIRECTIONS = ['RISING', 'FALLING', 'STABLE'] as const;
export type TrendDirection = (typeof TREND_DIRECTIONS)[number];

/** JSON-LD Schema.org types supported by the module. */
export const JSON_LD_TYPES = [
  'Article',
  'BlogPosting',
  'NewsArticle',
  'Event',
  'WebSite',
  'WebPage',
  'BreadcrumbList',
  'FAQPage',
  'HowTo',
  'Organization',
  'Person',
  'Product',
  'LocalBusiness',
  'VideoObject',
  'ImageObject',
  'SearchAction',
] as const;
export type JsonLdType = (typeof JSON_LD_TYPES)[number];

/** Robots meta directives. */
export const ROBOTS_DIRECTIVES = [
  'index',
  'noindex',
  'follow',
  'nofollow',
  'noarchive',
  'nosnippet',
  'noimageindex',
  'max-snippet',
  'max-image-preview',
  'max-video-preview',
  'notranslate',
  'noodp',
] as const;
export type RobotsDirective = (typeof ROBOTS_DIRECTIVES)[number];

/* ========================================================================== */
/*  SECTION 2 — Audit Interfaces                                              */
/* ========================================================================== */

/** A single audit check result with scoring. */
export interface AuditCheck {
  name: string;
  status: AuditStatus;
  severity: AuditSeverity;
  message: string;
  recommendation?: string;
  score: number;
  maxScore: number;
  details?: Record<string, unknown>;
}

/** Complete audit result for a single content item. */
export interface AuditResult {
  targetType: SeoTargetType;
  targetId: string;
  overallScore: number;
  checks: AuditCheck[];
  recommendations: string[];
  timestamp: string;
}

/** Site-wide audit aggregation (covers both posts and pages). */
export interface SiteAuditResult {
  overallScore: number;
  totalContent: number;
  averageScore: number;
  globalIssues: AuditCheck[];
  perContentResults: AuditResult[];
  timestamp: string;
}

/** Content that can be audited — the canonical input shape. */
export interface AuditableContent {
  id: string;
  title: string;
  slug: string;
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
  excerpt?: string | null;
  featuredImage?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterCard?: string | null;
  canonicalUrl?: string | null;
  wordCount?: number;
  readingTime?: number;
  categories?: { name: string; slug: string }[];
  tags?: { name: string; slug: string }[];
  autoTags?: string[];
  internalLinks?: { targetId: string; anchor: string }[];
  externalLinks?: string[];
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  author?: { name: string; url?: string } | null;
  headings?: { level: number; text: string }[];
  images?: { src: string; alt?: string; title?: string }[];
  structuredData?: Record<string, unknown> | null;
  language?: string;
  status?: string;
}

/* ========================================================================== */
/*  SECTION 3 — Suggestion Interfaces                                         */
/* ========================================================================== */

export interface SeoSuggestion {
  id: string;
  targetType: SeoTargetType;
  targetId: string;
  category: SeoSuggestionCategory;
  title: string;
  description: string;
  severity: AuditSeverity;
  status: SeoSuggestionStatus;
  source: SeoSuggestionSource;
  proposed?: Record<string, unknown> | null;
  autoApply: boolean;
  createdById?: string | null;
  decidedById?: string | null;
  decisionNote?: string | null;
  appliedAt?: Date | string | null;
  createdAt: Date | string;
}

export interface SuggestionDecision {
  status: 'APPROVED' | 'REJECTED';
  note?: string;
  decidedBy?: string;
}

/* ========================================================================== */
/*  SECTION 4 — Keyword Interfaces                                            */
/* ========================================================================== */

export interface SeoKeyword {
  slug: string;
  term: string;
  intent: SeoKeywordIntent;
  source: string;
  lastSeenAt: Date | string;
  volume?: number | null;
  competition?: number | null;
  cpc?: number | null;
}

export interface KeywordAnalysis {
  term: string;
  frequency: number;
  density: number;
  intent: SeoKeywordIntent;
  prominence: number;
}

/* ========================================================================== */
/*  SECTION 5 — Entity & Graph Interfaces                                     */
/* ========================================================================== */

export interface SeoEntity {
  id: string;
  slug: string;
  type: SeoEntityType;
  name: string;
  source: string;
  updatedAt: Date | string;
}

export interface SeoEntityEdge {
  id: string;
  fromId: string;
  toId: string;
  relation: SeoEntityRelation;
  weight: number;
}

export interface GraphAnalysis {
  hasCycles: boolean;
  cycles: string[][];
  stronglyConnectedComponents: string[][];
  nodeCount: number;
  edgeCount: number;
}

export interface ShortestPath {
  path: string[];
  distance: number;
  found: boolean;
}

/* ========================================================================== */
/*  SECTION 6 — Volume History & Trend Interfaces                             */
/* ========================================================================== */

export interface KeywordVolumeSnapshot {
  keyword: string;
  volume: number;
  timestamp: Date | string;
  source: string;
  competition?: number | null;
}

export interface KeywordTrend {
  keyword: string;
  direction: TrendDirection;
  currentVolume: number;
  previousVolume: number;
  changePercent: number;
}

/* ========================================================================== */
/*  SECTION 7 — Batch Operation Interfaces                                    */
/* ========================================================================== */

export interface BatchOperation {
  id: string;
  name: string;
  suggestions: SeoSuggestion[];
  status: BatchStatus;
  createdAt: Date | string;
  appliedAt?: Date | string | null;
  results?: BatchResult[];
}

export interface BatchResult {
  suggestionId: string;
  success: boolean;
  error?: string;
}

/* ========================================================================== */
/*  SECTION 8 — Sitemap Interfaces                                            */
/* ========================================================================== */

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangeFrequency;
  priority?: number;
  images?: SitemapImage[];
  news?: SitemapNews;
  alternates?: SitemapAlternate[];
}

export interface SitemapImage {
  loc: string;
  caption?: string;
  title?: string;
  geoLocation?: string;
  license?: string;
}

export interface SitemapNews {
  publicationName: string;
  publicationLanguage: string;
  publicationDate: string;
  title: string;
  keywords?: string[];
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapConfig {
  baseUrl: string;
  includePages?: boolean;
  includePosts?: boolean;
  includeCategories?: boolean;
  includeTags?: boolean;
  includeAuthors?: boolean;
  includeImages?: boolean;
  includeNews?: boolean;
  customUrls?: SitemapEntry[];
  excludeSlugs?: string[];
  maxEntriesPerSitemap?: number;
  defaultChangeFreq?: SitemapChangeFrequency;
  defaultPriority?: number;
  staticUrls?: { path: string; priority?: number; changefreq?: SitemapChangeFrequency }[];
}

export interface SitemapStats {
  totalUrls: number;
  byType: Record<string, number>;
  lastGenerated?: string;
  sizeBytes?: number;
}

/* ========================================================================== */
/*  SECTION 9 — Robots Interfaces                                             */
/* ========================================================================== */

export interface RobotsRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
}

export interface RobotsConfig {
  rules: RobotsRule[];
  sitemapUrls?: string[];
  host?: string;
}

/* ========================================================================== */
/*  SECTION 10 — JSON-LD Input Interfaces                                     */
/* ========================================================================== */

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  authorName: string;
  authorUrl?: string;
  publishedAt: string;
  modifiedAt?: string;
  section?: string;
  tags?: string[];
  wordCount?: number;
  language?: string;
  publisherName?: string;
  publisherLogoUrl?: string;
}

export interface EventJsonLdInput {
  name: string;
  description?: string;
  url: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  venue?: string;
  organizerName?: string;
  organizerUrl?: string;
  isOnline?: boolean;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'SoldOut' | 'PreOrder';
}

export interface WebSiteJsonLdInput {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
  language?: string;
}

export interface WebPageJsonLdInput {
  name: string;
  url: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  datePublished?: string;
  dateModified?: string;
  imageUrl?: string;
  inLanguage?: string;
  isPartOf?: { name: string; url: string };
  primaryImageOfPage?: string;
  speakable?: string[];
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  imageUrl?: string;
}

export interface HowToJsonLdInput {
  name: string;
  description: string;
  totalTime?: string;
  estimatedCost?: { currency: string; value: number };
  steps: HowToStep[];
  imageUrl?: string;
}

export interface OrganizationJsonLdInput {
  name: string;
  url: string;
  logoUrl?: string;
  description?: string;
  socialLinks?: string[];
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ProductJsonLdInput {
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
  brand?: string;
  sku?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
  ratingValue?: number;
  ratingCount?: number;
  reviewCount?: number;
}

export interface LocalBusinessJsonLdInput {
  name: string;
  url: string;
  description?: string;
  imageUrl?: string;
  phone?: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  geo?: { latitude: number; longitude: number };
  openingHours?: string[];
  priceRange?: string;
}

export interface VideoJsonLdInput {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
}

export interface PersonJsonLdInput {
  name: string;
  url?: string;
  imageUrl?: string;
  jobTitle?: string;
  worksFor?: string;
  sameAs?: string[];
}

/* ========================================================================== */
/*  SECTION 11 — Meta Tag Interfaces                                          */
/* ========================================================================== */

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  robots?: string;
  og?: OpenGraphMeta;
  twitter?: TwitterCardMeta;
  verification?: VerificationMeta;
  alternateLanguages?: { hreflang: string; href: string }[];
  structuredData?: Record<string, unknown>[];
}

export interface OpenGraphMeta {
  title?: string;
  description?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'book';
  siteName?: string;
  locale?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export interface TwitterCardMeta {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

export interface VerificationMeta {
  google?: string;
  bing?: string;
  yandex?: string;
  pinterest?: string;
  facebook?: string;
  norton?: string;
  custom?: { name: string; content: string }[];
}

/* ========================================================================== */
/*  SECTION 12 — Title Quality & Bulk Enhancement                             */
/* ========================================================================== */

export interface TitleQualityScore {
  overall: number;
  lengthScore: number;
  powerWordScore: number;
  emotionalScore: number;
  clickabilityScore: number;
  readabilityScore: number;
  powerWordsFound: string[];
  emotionalWordsFound: string[];
  issues: string[];
  suggestions: string[];
}

export interface BulkEnhancementStats {
  totalContent: number;
  enhanced: number;
  skipped: number;
  failed: number;
  fieldCompleteness: Record<
    string,
    { total: number; filled: number; percentage: number }
  >;
}

export interface BulkEnhancementResult {
  contentId: string;
  contentType: 'POST' | 'PAGE';
  success: boolean;
  fieldsUpdated: string[];
  error?: string;
}

/* ========================================================================== */
/*  SECTION 13 — API Response Envelope                                        */
/* ========================================================================== */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string; details?: unknown };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    timestamp: string;
  };
}

/* ========================================================================== */
/*  SECTION 14 — Service Dependency Injection Contracts                       */
/* ========================================================================== */

export interface SeoServiceDeps {
  post: PrismaPostDelegate;
  page: PrismaPageDelegate;
  category: PrismaCategoryDelegate;
  tag: PrismaTagDelegate;
  seoSuggestion: PrismaSeoSuggestionDelegate;
  seoKeyword: PrismaSeoKeywordDelegate;
  seoEntity: PrismaSeoEntityDelegate;
  seoEntityEdge: PrismaSeoEntityEdgeDelegate;
  batchOperation: PrismaBatchOperationDelegate;
  transaction: PrismaTransactionFn;
  rawQuery: PrismaRawQueryFn;
  cache?: CacheProvider;
  logger?: Logger;
}

/* ========================================================================== */
/*  SECTION 15 — Prisma Delegate Interfaces (typed surface)                   */
/* ========================================================================== */

export interface PrismaPostDelegate {
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }): Promise<AuditableContent | null>;
  findMany(args: Record<string, unknown>): Promise<AuditableContent[]>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<unknown>;
  count(args?: Record<string, unknown>): Promise<number>;
}

export interface PrismaPageDelegate {
  findUnique(args: {
    where: { id: string };
    include?: Record<string, unknown>;
  }): Promise<AuditableContent | null>;
  findMany(args: Record<string, unknown>): Promise<AuditableContent[]>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<unknown>;
  count(args?: Record<string, unknown>): Promise<number>;
}

export interface PrismaCategoryDelegate {
  findMany(
    args?: Record<string, unknown>,
  ): Promise<
    { id: string; name: string; slug: string; updatedAt: Date }[]
  >;
}

export interface PrismaTagDelegate {
  findMany(
    args?: Record<string, unknown>,
  ): Promise<
    { id: string; name: string; slug: string; updatedAt: Date }[]
  >;
}

export interface PrismaSeoSuggestionDelegate {
  findMany(args?: Record<string, unknown>): Promise<SeoSuggestion[]>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: {
    data: Omit<SeoSuggestion, 'id' | 'createdAt'>;
  }): Promise<SeoSuggestion>;
  update(args: {
    where: { id: string };
    data: Partial<SeoSuggestion>;
  }): Promise<SeoSuggestion>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
}

export interface PrismaSeoKeywordDelegate {
  findMany(args?: Record<string, unknown>): Promise<SeoKeyword[]>;
  upsert(args: {
    where: { slug: string };
    create: Omit<SeoKeyword, 'lastSeenAt'>;
    update: Partial<SeoKeyword>;
  }): Promise<SeoKeyword>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
}

export interface PrismaSeoEntityDelegate {
  findMany(args?: Record<string, unknown>): Promise<SeoEntity[]>;
  upsert(args: {
    where: Record<string, unknown>;
    create: Omit<SeoEntity, 'id' | 'updatedAt'>;
    update: Partial<SeoEntity>;
  }): Promise<SeoEntity>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
}

export interface PrismaSeoEntityEdgeDelegate {
  findMany(args?: Record<string, unknown>): Promise<SeoEntityEdge[]>;
  upsert(args: {
    where: Record<string, unknown>;
    create: Omit<SeoEntityEdge, 'id'>;
    update: Partial<SeoEntityEdge>;
  }): Promise<SeoEntityEdge>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
}

export interface PrismaBatchOperationDelegate {
  findUnique(args: {
    where: { id: string };
  }): Promise<BatchOperation | null>;
  findMany(args?: Record<string, unknown>): Promise<BatchOperation[]>;
  create(args: {
    data: Omit<BatchOperation, 'id' | 'createdAt'>;
  }): Promise<BatchOperation>;
  update(args: {
    where: { id: string };
    data: Partial<BatchOperation>;
  }): Promise<BatchOperation>;
}

export type PrismaTransactionFn = <T>(
  fn: (tx: Record<string, unknown>) => Promise<T>,
) => Promise<T>;

export type PrismaRawQueryFn = (
  query: string,
  ...params: unknown[]
) => Promise<unknown[]>;

/* ========================================================================== */
/*  SECTION 16 — Infrastructure Contracts                                     */
/* ========================================================================== */

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
