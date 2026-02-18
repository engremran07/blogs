// pages/schemas.ts
// Zod validation schemas for the Pages module.
// Covers: pages, bulk operations, listing filters, admin settings.
// Framework-agnostic — import { z } from 'zod'.

import { z } from 'zod';
import {
  PAGE_STATUSES, PAGE_TEMPLATES, PAGE_VISIBILITIES,
  PAGE_SORT_FIELDS, SORT_ORDERS, SYSTEM_PAGE_KEYS,
} from '../types';
import { PAGE_LIMITS } from './constants';

/* ========================================================================== */
/*  COMMON                                                                    */
/* ========================================================================== */

const idSchema = z.string().min(1, 'ID is required');

const idArraySchema = z
  .array(z.string().min(1))
  .max(PAGE_LIMITS.MAX_BULK_SIZE, `Maximum ${PAGE_LIMITS.MAX_BULK_SIZE} items`);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGE_LIMITS.MAX_PAGES_PER_PAGE).default(20),
});

const urlOrNull = z.string().url().nullish();

/* ========================================================================== */
/*  PAGE SCHEMAS                                                              */
/* ========================================================================== */

export const CreatePageSchema = z.object({
  title: z.string()
    .min(PAGE_LIMITS.TITLE_MIN_LENGTH, `Title must be at least ${PAGE_LIMITS.TITLE_MIN_LENGTH} characters`)
    .max(PAGE_LIMITS.TITLE_MAX_LENGTH, `Title must be at most ${PAGE_LIMITS.TITLE_MAX_LENGTH} characters`)
    .transform(s => s.trim()),
  slug: z.string().max(200).nullish(),
  content: z.string().default(''),
  excerpt: z.string().max(PAGE_LIMITS.EXCERPT_MAX_LENGTH).nullish(),
  status: z.enum(PAGE_STATUSES).default('DRAFT'),
  template: z.enum(PAGE_TEMPLATES).default('DEFAULT'),
  visibility: z.enum(PAGE_VISIBILITIES).default('PUBLIC'),
  authorId: idSchema,

  // SEO
  metaTitle: z.string().max(PAGE_LIMITS.META_TITLE_MAX).nullish(),
  metaDescription: z.string().max(PAGE_LIMITS.META_DESCRIPTION_MAX).nullish(),
  ogTitle: z.string().max(PAGE_LIMITS.META_TITLE_MAX).nullish(),
  ogDescription: z.string().max(PAGE_LIMITS.META_DESCRIPTION_MAX).nullish(),
  ogImage: urlOrNull,
  canonicalUrl: z.string().max(PAGE_LIMITS.CANONICAL_URL_MAX).nullish(),
  noIndex: z.boolean().default(false),
  noFollow: z.boolean().default(false),
  structuredData: z.record(z.string(), z.unknown()).nullish(),

  // Hierarchy
  parentId: z.string().nullish(),
  sortOrder: z.number().int().min(0).default(0),

  // Media
  featuredImage: urlOrNull,
  featuredImageAlt: z.string().max(250).nullish(),

  // Guards
  password: z.string().max(PAGE_LIMITS.PASSWORD_MAX).nullish(),

  // Code injection
  customCss: z.string().max(PAGE_LIMITS.CUSTOM_CSS_MAX).nullish(),
  customJs: z.string().max(PAGE_LIMITS.CUSTOM_JS_MAX).nullish(),
  customHead: z.string().max(PAGE_LIMITS.CUSTOM_HEAD_MAX).nullish(),

  // Scheduling
  scheduledFor: z.coerce.date().nullish(),
});
export type CreatePagePayload = z.infer<typeof CreatePageSchema>;

export const UpdatePageSchema = z.object({
  title: z.string()
    .min(PAGE_LIMITS.TITLE_MIN_LENGTH)
    .max(PAGE_LIMITS.TITLE_MAX_LENGTH)
    .transform(s => s.trim())
    .optional(),
  content: z.string().optional(),
  excerpt: z.string().max(PAGE_LIMITS.EXCERPT_MAX_LENGTH).nullish(),
  status: z.enum(PAGE_STATUSES).optional(),
  template: z.enum(PAGE_TEMPLATES).optional(),
  visibility: z.enum(PAGE_VISIBILITIES).optional(),

  // SEO
  metaTitle: z.string().max(PAGE_LIMITS.META_TITLE_MAX).nullish(),
  metaDescription: z.string().max(PAGE_LIMITS.META_DESCRIPTION_MAX).nullish(),
  ogTitle: z.string().max(PAGE_LIMITS.META_TITLE_MAX).nullish(),
  ogDescription: z.string().max(PAGE_LIMITS.META_DESCRIPTION_MAX).nullish(),
  ogImage: urlOrNull,
  canonicalUrl: z.string().max(PAGE_LIMITS.CANONICAL_URL_MAX).nullish(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  structuredData: z.record(z.string(), z.unknown()).nullish(),

  // Hierarchy
  parentId: z.string().nullish(),
  sortOrder: z.number().int().min(0).optional(),

  // Media
  featuredImage: urlOrNull,
  featuredImageAlt: z.string().max(250).nullish(),

  // Guards
  password: z.string().max(PAGE_LIMITS.PASSWORD_MAX).nullish(),

  // Code injection
  customCss: z.string().max(PAGE_LIMITS.CUSTOM_CSS_MAX).nullish(),
  customJs: z.string().max(PAGE_LIMITS.CUSTOM_JS_MAX).nullish(),
  customHead: z.string().max(PAGE_LIMITS.CUSTOM_HEAD_MAX).nullish(),

  // Scheduling
  scheduledFor: z.coerce.date().nullish(),

  // Revision note
  changeNote: z.string().max(PAGE_LIMITS.CHANGE_NOTE_MAX).nullish(),
});
export type UpdatePagePayload = z.infer<typeof UpdatePageSchema>;

/* ========================================================================== */
/*  LISTING / FILTER SCHEMAS                                                  */
/* ========================================================================== */

export const PageListSchema = paginationSchema.extend({
  search: z.string().max(PAGE_LIMITS.SEARCH_MAX_LENGTH).optional(),
  status: z.enum(PAGE_STATUSES).optional(),
  template: z.enum(PAGE_TEMPLATES).optional(),
  visibility: z.enum(PAGE_VISIBILITIES).optional(),
  parentId: z.string().nullish(),
  isSystem: z.coerce.boolean().optional(),
  systemKey: z.enum(SYSTEM_PAGE_KEYS).optional(),
  authorId: z.string().optional(),
  sortBy: z.enum(PAGE_SORT_FIELDS).default('sortOrder'),
  sortOrder: z.enum(SORT_ORDERS).default('asc'),
  includeDeleted: z.coerce.boolean().default(false),
});
export type PageListPayload = z.infer<typeof PageListSchema>;

/* ========================================================================== */
/*  BULK OPERATION SCHEMAS                                                    */
/* ========================================================================== */

export const BulkUpdateStatusSchema = z.object({
  ids: idArraySchema,
  status: z.enum(PAGE_STATUSES),
});
export type BulkUpdateStatusPayload = z.infer<typeof BulkUpdateStatusSchema>;

export const BulkDeleteSchema = z.object({
  ids: idArraySchema,
  permanent: z.boolean().default(false),
});
export type BulkDeletePayload = z.infer<typeof BulkDeleteSchema>;

export const BulkScheduleSchema = z.object({
  ids: idArraySchema,
  scheduledFor: z.coerce.date(),
});
export type BulkSchedulePayload = z.infer<typeof BulkScheduleSchema>;

export const BulkReorderSchema = z.object({
  /** Array of { id, sortOrder } tuples. */
  items: z.array(z.object({
    id: z.string().min(1),
    sortOrder: z.number().int().min(0),
  })).max(PAGE_LIMITS.MAX_BULK_SIZE),
});
export type BulkReorderPayload = z.infer<typeof BulkReorderSchema>;

export const BulkMoveSchema = z.object({
  ids: idArraySchema,
  parentId: z.string().nullish(),
});
export type BulkMovePayload = z.infer<typeof BulkMoveSchema>;

export const BulkTemplateSchema = z.object({
  ids: idArraySchema,
  template: z.enum(PAGE_TEMPLATES),
});
export type BulkTemplatePayload = z.infer<typeof BulkTemplateSchema>;

/* ========================================================================== */
/*  LOCK SCHEMA                                                               */
/* ========================================================================== */

export const LockPageSchema = z.object({
  pageId: idSchema,
  userId: idSchema,
});
export type LockPagePayload = z.infer<typeof LockPageSchema>;

export const SetHomePageSchema = z.object({
  pageId: idSchema,
});
export type SetHomePagePayload = z.infer<typeof SetHomePageSchema>;

export const BulkRestoreSchema = z.object({
  ids: idArraySchema,
});
export type BulkRestorePayload = z.infer<typeof BulkRestoreSchema>;

export const BulkSetVisibilitySchema = z.object({
  ids: idArraySchema,
  visibility: z.enum(PAGE_VISIBILITIES),
});
export type BulkSetVisibilityPayload = z.infer<typeof BulkSetVisibilitySchema>;

/* ========================================================================== */
/*  ADMIN SETTINGS SCHEMA                                                     */
/* ========================================================================== */

export const UpdatePageSettingsSchema = z.object({
  pagesPerPage: z.number().int().min(1).max(100).optional(),
  minWordCount: z.number().int().min(0).optional(),
  readingSpeedWpm: z.number().int().min(50).max(1000).optional(),
  pagesBaseUrl: z.string().max(200).optional(),
  excerptLength: z.number().int().min(50).max(1000).optional(),
  lockTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  maxRevisionsPerPage: z.number().int().min(0).max(500).optional(),
  maxDepth: z.number().int().min(1).max(10).optional(),
  allowCodeInjection: z.boolean().optional(),
  enableRevisions: z.boolean().optional(),
  enableLocking: z.boolean().optional(),
  enableScheduling: z.boolean().optional(),
  enableHierarchy: z.boolean().optional(),
  enablePasswordProtection: z.boolean().optional(),
  autoRegisterSystemPages: z.boolean().optional(),
  defaultTemplate: z.enum(PAGE_TEMPLATES).optional(),
  defaultVisibility: z.enum(PAGE_VISIBILITIES).optional(),
  defaultStatus: z.enum(PAGE_STATUSES).optional(),
});
export type UpdatePageSettingsPayload = z.infer<typeof UpdatePageSettingsSchema>;
