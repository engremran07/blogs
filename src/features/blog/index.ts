// blog/index.ts
// Barrel exports for the Blog module.

/* ── Types ───────────────────────────────────────────────────────── */
export type {
  Post, PostWithRelations,
  Category, CategoryWithChildren,
  Series, SeriesWithPosts,
  PostRevision, PostQuote,

  PostStatus, SeriesStatus,
  PostSortField, SortOrder,

  CreatePostInput, UpdatePostInput,
  CreateCategoryInput, UpdateCategoryInput,
  CreateSeriesInput, UpdateSeriesInput,
  CreateQuoteInput, UpdateQuoteInput,

  PostListOptions, PaginatedResult,
  RelatedPost,
  ScheduledPost, ScheduleProcessResult,
  PostLockInfo, PostStats,
  ViewIncrementResult,

  AdjacentPosts, CategoryBreadcrumb,
  SearchSuggestion, TocEntry,
  RssFeedItem, RssFeed, SitemapEntry,
  RevisionDiff, DiffChange,

  BlogConfig,
  BlogPrismaClient, BlogCacheProvider, BlogLogger, RevalidationCallback,
} from './types';

export {
  POST_STATUSES, SERIES_STATUSES,
  POST_SORT_FIELDS, SORT_ORDERS,
  BlogError,
} from './types';

/* ── Constants ───────────────────────────────────────────────────── */
export {
  CACHE_PREFIX, CACHE_KEYS, CACHE_TTL,
  BLOG_LIMITS, BLOG_DEFAULTS,
  generateSlug, capitalizeFirst,
  calculateReadingTime, countWords, stripHtml, truncate,
  generateExcerpt, normalizeIds, isPast, hashListOptions,
  extractHeadings, buildTocTree, extractBlockquotes,
  toRfc822, toW3CDate,
} from './server/constants';

/* ── Schemas (Zod) ───────────────────────────────────────────────── */
export {
  CreatePostSchema, UpdatePostSchema,
  CreateCategorySchema, BulkCreateCategoriesSchema, UpdateCategorySchema,
  CreateSeriesSchema, UpdateSeriesSchema,
  BulkUpdateStatusSchema, BulkDeleteSchema, BulkScheduleSchema,
  BulkFeatureSchema, BulkCategorySchema,
  PostListSchema, CategoryListSchema, SeriesListSchema,
  LockPostSchema,
  ReorderPinnedSchema, ReorderSeriesSchema,
  CreateQuoteSchema, UpdateQuoteSchema,
  SearchSuggestionsSchema,
} from './server/schemas';

export type {
  CreatePostPayload, UpdatePostPayload,
  CreateCategoryPayload, UpdateCategoryPayload,
  CreateSeriesPayload, UpdateSeriesPayload,
  BulkUpdateStatusPayload, BulkDeletePayload, BulkSchedulePayload,
  BulkFeaturePayload, BulkCategoryPayload,
  PostListPayload, CategoryListPayload, SeriesListPayload,
  CreateQuotePayload, UpdateQuotePayload,
  SearchSuggestionsPayload,
} from './server/schemas';

/* ── Sanitization ────────────────────────────────────────────────── */
export {
  sanitizeHtml, sanitizeText, sanitizeSlug,
  sanitizeCategoryName, escapeHtml, sanitizeUrl, sanitizeContent,
} from './server/sanitization.util';

/* ── Service ─────────────────────────────────────────────────────── */
export { BlogService } from './server/blog.service';
export type { BlogServiceDeps } from './server/blog.service';
