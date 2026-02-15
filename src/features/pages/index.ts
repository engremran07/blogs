// pages/index.ts
// Barrel exports — single import entry-point for the pages module.

/* ─── Types ─────────────────────────────────────────────────────────────── */
export type {
  // Enums / literals
  PageStatus,
  PageTemplate,
  PageVisibility,
  PageSortField,
  SortOrder,
  SystemPageKey,

  // Core entities
  Page,
  PageRevision,

  // Relation shapes
  PageWithRelations,
  PageWithChildren,
  PageTreeNode,

  // Input types
  CreatePageInput,
  UpdatePageInput,
  PageListOptions,

  // Result types
  PaginatedResult,
  PageLockInfo,
  ScheduledPage,
  ScheduleProcessResult,
  PageStats,
  SystemPageRegistration,

  // Config
  PagesConfig,
  PagesSystemSettings,
  PagesConfigConsumer,

  // API response
  ApiSuccess,
  ApiError,
  ApiResponse,

  // DI interfaces
  PagesPrismaDelegate,
  PagesPrismaClient,
  PagesCacheProvider,
  PagesLogger,
  PagesRevalidationCallback,
} from './types';

export {
  PAGE_STATUSES,
  PAGE_TEMPLATES,
  PAGE_VISIBILITIES,
  PAGE_SORT_FIELDS,
  SORT_ORDERS,
  SYSTEM_PAGE_KEYS,
  PageError,
} from './types';

/* ─── Constants & Helpers ──────────────────────────────────────────────── */
export {
  CACHE_PREFIX,
  CACHE_KEYS,
  CACHE_TTL,
  PAGE_LIMITS,
  PAGES_DEFAULTS,
  SYSTEM_PAGES_REGISTRY,
  RESERVED_SLUGS,
  generateSlug,
  calculateReadingTime,
  countWords,
  stripHtml,
  truncate,
  generateExcerpt,
  isPast,
  normalizeIds,
  buildPagePath,
  hashListOptions,
} from './server/constants';

export type { SystemPageDefinition } from './server/constants';

/* ─── Schemas ──────────────────────────────────────────────────────────── */
export {
  CreatePageSchema,
  UpdatePageSchema,
  PageListSchema,
  BulkUpdateStatusSchema,
  BulkDeleteSchema,
  BulkScheduleSchema,
  BulkReorderSchema,
  BulkMoveSchema,
  BulkTemplateSchema,
  BulkRestoreSchema,
  BulkSetVisibilitySchema,
  LockPageSchema,
  SetHomePageSchema,
  UpdatePageSettingsSchema,
} from './server/schemas';

export type {
  CreatePagePayload,
  UpdatePagePayload,
  PageListPayload,
  BulkUpdateStatusPayload,
  BulkDeletePayload,
  BulkSchedulePayload,
  BulkReorderPayload,
  BulkMovePayload,
  BulkTemplatePayload,
  BulkRestorePayload,
  BulkSetVisibilityPayload,
  LockPagePayload,
  SetHomePagePayload,
  UpdatePageSettingsPayload,
} from './server/schemas';

/* ─── Services ─────────────────────────────────────────────────────────── */
export { PageService } from './server/page.service';
export type { PageServiceDeps } from './server/page.service';
export { PagesAdminSettingsService } from './server/admin-settings.service';
