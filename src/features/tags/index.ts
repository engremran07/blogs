// tags/index.ts — barrel export for the tags module

// ── Types ────────────────────────────────────────────────────────────────
export {
  TagSortField,
  TagEvent,
  AutocompleteMode,
} from './types';
export type {
  TagData,
  TagWithRelations,
  TagSummary,
  TagFollowData,
  TagAnalytics,
  DuplicateCandidate,
  AutoTagResult,
  TagSuggestion,
  BatchAutoTagResult,
  AutocompleteQuery,
  AutocompleteResult,
  AutocompleteResponse,
  TagCloudItem,
  ParseTagsOptions,
  TagSystemSettings,
  CreateTagInput,
  UpdateTagInput,
  QueryTagsInput,
  MergeTagsInput,
  BulkStyleInput,
  BulkParentInput,
  BulkLockInput,
  DuplicateGroup,
  BulkMergeResult,
  FollowTagInput,
  SmartAutoTagInput,
  PaginatedResult,
  ApiResponse,
  LlmService,
  TagsConfig,
  TagsPrismaClient,
  PrismaDelegate,
} from './types';

// ── Constants ────────────────────────────────────────────────────────────
export { DEFAULT_CONFIG, STOP_WORDS, MODERATOR_ROLES } from './server/constants';

// ── Zod Schemas ──────────────────────────────────────────────────────────
export {
  createTagSchema,
  updateTagSchema,
  queryTagsSchema,
  mergeTagsSchema,
  bulkIdsSchema,
  bulkStyleSchema,
  bulkParentSchema,
  bulkLockSchema,
  bulkDeleteSchema,
  bulkMergeDuplicatesSchema,
  followTagSchema,
  smartAutoTagSchema,
  batchAutoTagSchema,
  suggestTagsSchema,
  autocompleteSchema,
  tagCloudSchema,
  parseTagStringSchema,
  updateTagSettingsSchema,
  loadInitialTagsSchema,
} from './server/schemas';
export type {
  CreateTagPayload,
  UpdateTagPayload,
  QueryTagsPayload,
  MergeTagsPayload,
  BulkIdsPayload,
  BulkStylePayload,
  BulkParentPayload,
  BulkLockPayload,
  BulkDeletePayload,
  BulkMergeDuplicatesPayload,
  FollowTagPayload,
  SmartAutoTagPayload,
  BatchAutoTagPayload,
  AutocompletePayload,
  TagCloudPayload,
  ParseTagStringPayload,
  UpdateTagSettingsPayload,
  LoadInitialTagsPayload,
} from './server/schemas';

// ── Services ─────────────────────────────────────────────────────────────
export { TagService } from './server/tag.service';
export { AutoTaggingService } from './server/auto-tagging.service';
export { AutocompleteService } from './server/autocomplete.service';
export { AdminSettingsService } from './server/admin-settings.service';
