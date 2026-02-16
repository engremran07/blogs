// blog/schemas.ts
// Zod validation schemas for the Blog module.
// Covers: posts, categories, series, bulk operations, listing filters.
// Framework-agnostic — import { z } from 'zod'.

import { z } from 'zod';
import { POST_STATUSES, POST_SORT_FIELDS, SORT_ORDERS, SERIES_STATUSES } from '../types';
import { BLOG_LIMITS } from './constants';

/* ========================================================================== */
/*  COMMON                                                                    */
/* ========================================================================== */

const idSchema = z.string().min(1, 'ID is required');

const idArraySchema = z
  .array(z.string().min(1))
  .max(BLOG_LIMITS.MAX_BULK_SIZE, `Maximum ${BLOG_LIMITS.MAX_BULK_SIZE} items`);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(BLOG_LIMITS.MAX_POSTS_PER_PAGE).default(10),
});

const urlOrNull = z.string().url().nullish();

/* ========================================================================== */
/*  POST SCHEMAS                                                              */
/* ========================================================================== */

export const CreatePostSchema = z.object({
  title: z.string()
    .min(BLOG_LIMITS.TITLE_MIN_LENGTH, `Title must be at least ${BLOG_LIMITS.TITLE_MIN_LENGTH} characters`)
    .max(BLOG_LIMITS.TITLE_MAX_LENGTH, `Title must be at most ${BLOG_LIMITS.TITLE_MAX_LENGTH} characters`)
    .transform(s => s.trim()),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(BLOG_LIMITS.EXCERPT_MAX_LENGTH).nullish(),
  status: z.enum(POST_STATUSES).default('DRAFT'),
  authorId: idSchema,

  // Media / Social
  featuredImage: urlOrNull,
  featuredImageAlt: z.string().max(250).nullish(),
  ogTitle: z.string().max(100).nullish(),
  ogDescription: z.string().max(200).nullish(),
  ogImage: urlOrNull,
  twitterTitle: z.string().max(100).nullish(),
  twitterDescription: z.string().max(200).nullish(),
  twitterImage: urlOrNull,

  // Scheduling
  scheduledFor: z.coerce.date().nullish(),

  // Taxonomy
  categoryIds: z.array(idSchema).max(BLOG_LIMITS.MAX_CATEGORIES_PER_POST).default([]),

  // Series
  seriesId: idSchema.nullish(),
  seriesOrder: z.number().int().min(0).optional(),

  // Access control
  password: z.string().max(BLOG_LIMITS.PASSWORD_MAX).nullish(),
  allowComments: z.boolean().default(true),

  // Guest posting
  isGuestPost: z.boolean().default(false),
  guestAuthorName: z.string().max(BLOG_LIMITS.GUEST_NAME_MAX).nullish(),
  guestAuthorEmail: z.string().email().max(BLOG_LIMITS.GUEST_EMAIL_MAX).nullish(),
  guestAuthorBio: z.string().max(BLOG_LIMITS.GUEST_BIO_MAX).nullish(),
  guestAuthorAvatar: urlOrNull,
  guestAuthorUrl: z.string().url().max(BLOG_LIMITS.GUEST_URL_MAX).nullish(),

  // Inline quotes
  quotes: z.array(z.object({
    text: z.string().min(1).max(BLOG_LIMITS.QUOTE_TEXT_MAX),
    attribution: z.string().max(BLOG_LIMITS.QUOTE_ATTRIBUTION_MAX).nullish(),
    source: z.string().max(BLOG_LIMITS.QUOTE_SOURCE_MAX).nullish(),
    sourceUrl: z.string().url().max(500).nullish(),
    sortOrder: z.number().int().min(0).default(0),
    isPullQuote: z.boolean().default(false),
  })).max(BLOG_LIMITS.MAX_QUOTES_PER_POST).default([]),

  // Meta
  canonicalUrl: z.string().url().max(BLOG_LIMITS.CANONICAL_URL_MAX).nullish(),
  language: z.string().max(10).nullish(),
  region: z.string().max(50).nullish(),
});

export const UpdatePostSchema = z.object({
  title: z.string()
    .min(BLOG_LIMITS.TITLE_MIN_LENGTH)
    .max(BLOG_LIMITS.TITLE_MAX_LENGTH)
    .transform(s => s.trim())
    .optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(BLOG_LIMITS.EXCERPT_MAX_LENGTH).nullish(),
  status: z.enum(POST_STATUSES).optional(),

  featuredImage: urlOrNull,
  featuredImageAlt: z.string().max(250).nullish(),
  ogTitle: z.string().max(100).nullish(),
  ogDescription: z.string().max(200).nullish(),
  ogImage: urlOrNull,
  twitterTitle: z.string().max(100).nullish(),
  twitterDescription: z.string().max(200).nullish(),
  twitterImage: urlOrNull,

  scheduledFor: z.coerce.date().nullish(),
  publishedAt: z.coerce.date().nullish(),

  categoryIds: z.array(idSchema).max(BLOG_LIMITS.MAX_CATEGORIES_PER_POST).optional(),

  seriesId: idSchema.nullish(),
  seriesOrder: z.number().int().min(0).optional(),

  password: z.string().max(BLOG_LIMITS.PASSWORD_MAX).nullish(),
  allowComments: z.boolean().optional(),

  // Guest posting
  isGuestPost: z.boolean().optional(),
  guestAuthorName: z.string().max(BLOG_LIMITS.GUEST_NAME_MAX).nullish(),
  guestAuthorEmail: z.string().email().max(BLOG_LIMITS.GUEST_EMAIL_MAX).nullish(),
  guestAuthorBio: z.string().max(BLOG_LIMITS.GUEST_BIO_MAX).nullish(),
  guestAuthorAvatar: urlOrNull,
  guestAuthorUrl: z.string().url().max(BLOG_LIMITS.GUEST_URL_MAX).nullish(),

  // Inline quotes
  quotes: z.array(z.object({
    text: z.string().min(1).max(BLOG_LIMITS.QUOTE_TEXT_MAX),
    attribution: z.string().max(BLOG_LIMITS.QUOTE_ATTRIBUTION_MAX).nullish(),
    source: z.string().max(BLOG_LIMITS.QUOTE_SOURCE_MAX).nullish(),
    sourceUrl: z.string().url().max(500).nullish(),
    sortOrder: z.number().int().min(0).default(0),
    isPullQuote: z.boolean().default(false),
  })).max(BLOG_LIMITS.MAX_QUOTES_PER_POST).optional(),

  canonicalUrl: z.string().url().max(BLOG_LIMITS.CANONICAL_URL_MAX).nullish(),
  language: z.string().max(10).nullish(),
  region: z.string().max(50).nullish(),

  changeNote: z.string().max(BLOG_LIMITS.CHANGE_NOTE_MAX).nullish(),
});

/* ========================================================================== */
/*  CATEGORY SCHEMAS                                                          */
/* ========================================================================== */

export const CreateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(BLOG_LIMITS.CATEGORY_NAME_MAX, 'Category name too long')
    .transform(s => s.trim()),
  description: z.string().max(500).nullish(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').nullish(),
  icon: z.string().max(50).nullish(),
  image: urlOrNull,
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  parentId: idSchema.nullish(),
});

/** Schema for creating multiple categories at once (comma-separated names). */
export const BulkCreateCategoriesSchema = z.object({
  names: z.string()
    .min(1, 'At least one category name is required')
    .transform(s => s.split(',').map(n => n.trim()).filter(n => n.length > 0)),
  description: z.string().max(500).nullish(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').nullish(),
  icon: z.string().max(50).nullish(),
  image: urlOrNull,
  featured: z.boolean().default(false),
  parentId: idSchema.nullish(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(BLOG_LIMITS.CATEGORY_NAME_MAX).transform(s => s.trim()).optional(),
  description: z.string().max(500).nullish(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  icon: z.string().max(50).nullish(),
  image: urlOrNull,
  featured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  parentId: idSchema.nullish(),
});

/* ========================================================================== */
/*  SERIES SCHEMAS                                                            */
/* ========================================================================== */

export const CreateSeriesSchema = z.object({
  title: z.string()
    .min(3, 'Series title too short')
    .max(BLOG_LIMITS.SERIES_TITLE_MAX, 'Series title too long')
    .transform(s => s.trim()),
  description: z.string().max(1000).nullish(),
  coverImage: urlOrNull,
  status: z.enum(SERIES_STATUSES).default('ACTIVE'),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateSeriesSchema = z.object({
  title: z.string().min(3).max(BLOG_LIMITS.SERIES_TITLE_MAX).transform(s => s.trim()).optional(),
  description: z.string().max(1000).nullish(),
  coverImage: urlOrNull,
  status: z.enum(SERIES_STATUSES).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/* ========================================================================== */
/*  BULK OPERATION SCHEMAS                                                    */
/* ========================================================================== */

export const BulkUpdateStatusSchema = z.object({
  postIds: idArraySchema.min(1, 'At least one post ID required'),
  status: z.enum(POST_STATUSES),
});

export const BulkDeleteSchema = z.object({
  postIds: idArraySchema.min(1, 'At least one post ID required'),
});

export const BulkScheduleSchema = z.object({
  postIds: idArraySchema.min(1),
  scheduledFor: z.coerce.date(),
});

export const BulkFeatureSchema = z.object({
  postIds: idArraySchema.min(1),
  isFeatured: z.boolean(),
});

export const BulkCategorySchema = z.object({
  postIds: idArraySchema.min(1),
  categoryIds: z.array(idSchema).min(1).max(BLOG_LIMITS.MAX_CATEGORIES_PER_POST),
});

/* ========================================================================== */
/*  LISTING / FILTER SCHEMAS                                                  */
/* ========================================================================== */

export const PostListSchema = paginationSchema.extend({
  status: z.enum(POST_STATUSES).optional(),
  authorId: idSchema.optional(),
  categoryId: idSchema.optional(),
  tagId: idSchema.optional(),
  seriesId: idSchema.optional(),
  search: z.string().max(BLOG_LIMITS.SEARCH_MAX_LENGTH).optional(),
  sortBy: z.enum(POST_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
  isFeatured: z.coerce.boolean().optional(),
  isPinned: z.coerce.boolean().optional(),
  isGuestPost: z.coerce.boolean().optional(),
  language: z.string().max(10).optional(),
  region: z.string().max(50).optional(),
});

export const CategoryListSchema = paginationSchema.extend({
  search: z.string().max(BLOG_LIMITS.SEARCH_MAX_LENGTH).optional(),
  featured: z.coerce.boolean().optional(),
  parentId: idSchema.optional(),
});

export const SeriesListSchema = paginationSchema.extend({
  search: z.string().max(BLOG_LIMITS.SEARCH_MAX_LENGTH).optional(),
  status: z.enum(SERIES_STATUSES).optional(),
});

/* ========================================================================== */
/*  QUOTE SCHEMAS                                                             */
/* ========================================================================== */

export const CreateQuoteSchema = z.object({
  postId: idSchema,
  text: z.string().min(1, 'Quote text is required').max(BLOG_LIMITS.QUOTE_TEXT_MAX),
  attribution: z.string().max(BLOG_LIMITS.QUOTE_ATTRIBUTION_MAX).nullish(),
  source: z.string().max(BLOG_LIMITS.QUOTE_SOURCE_MAX).nullish(),
  sourceUrl: z.string().url().max(500).nullish(),
  sortOrder: z.number().int().min(0).default(0),
  isPullQuote: z.boolean().default(false),
});

export const UpdateQuoteSchema = z.object({
  text: z.string().min(1).max(BLOG_LIMITS.QUOTE_TEXT_MAX).optional(),
  attribution: z.string().max(BLOG_LIMITS.QUOTE_ATTRIBUTION_MAX).nullish(),
  source: z.string().max(BLOG_LIMITS.QUOTE_SOURCE_MAX).nullish(),
  sourceUrl: z.string().url().max(500).nullish(),
  sortOrder: z.number().int().min(0).optional(),
  isPullQuote: z.boolean().optional(),
});

/* ========================================================================== */
/*  SEARCH SUGGESTIONS SCHEMA                                                 */
/* ========================================================================== */

export const SearchSuggestionsSchema = z.object({
  query: z.string().min(2).max(BLOG_LIMITS.SEARCH_MAX_LENGTH),
  limit: z.coerce.number().int().min(1).max(BLOG_LIMITS.SEARCH_SUGGESTIONS_MAX).default(5),
});

/* ========================================================================== */
/*  LOCKING SCHEMA                                                            */
/* ========================================================================== */

export const LockPostSchema = z.object({
  postId: idSchema,
  userId: idSchema,
});

/* ========================================================================== */
/*  REORDER SCHEMAS                                                           */
/* ========================================================================== */

export const ReorderPinnedSchema = z.object({
  /** Ordered array of post IDs from highest to lowest pin priority. */
  postIds: z.array(idSchema).min(1).max(BLOG_LIMITS.MAX_BULK_SIZE),
});

export const ReorderSeriesSchema = z.object({
  seriesId: idSchema,
  /** Ordered array of post IDs in desired reading order. */
  postIds: z.array(idSchema).min(1).max(BLOG_LIMITS.MAX_BULK_SIZE),
});

/* ========================================================================== */
/*  INFERRED TYPES                                                            */
/* ========================================================================== */

export type CreatePostPayload = z.infer<typeof CreatePostSchema>;
export type UpdatePostPayload = z.infer<typeof UpdatePostSchema>;
export type CreateCategoryPayload = z.infer<typeof CreateCategorySchema>;
export type BulkCreateCategoriesPayload = z.infer<typeof BulkCreateCategoriesSchema>;
export type UpdateCategoryPayload = z.infer<typeof UpdateCategorySchema>;
export type CreateSeriesPayload = z.infer<typeof CreateSeriesSchema>;
export type UpdateSeriesPayload = z.infer<typeof UpdateSeriesSchema>;
export type BulkUpdateStatusPayload = z.infer<typeof BulkUpdateStatusSchema>;
export type BulkDeletePayload = z.infer<typeof BulkDeleteSchema>;
export type BulkSchedulePayload = z.infer<typeof BulkScheduleSchema>;
export type BulkFeaturePayload = z.infer<typeof BulkFeatureSchema>;
export type BulkCategoryPayload = z.infer<typeof BulkCategorySchema>;
export type PostListPayload = z.infer<typeof PostListSchema>;
export type CategoryListPayload = z.infer<typeof CategoryListSchema>;
export type SeriesListPayload = z.infer<typeof SeriesListSchema>;
export type CreateQuotePayload = z.infer<typeof CreateQuoteSchema>;
export type UpdateQuotePayload = z.infer<typeof UpdateQuoteSchema>;
export type SearchSuggestionsPayload = z.infer<typeof SearchSuggestionsSchema>;
