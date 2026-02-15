// features/media/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel exports for the Media feature module.
// ─────────────────────────────────────────────────────────────────────────────

/* ── Types ───────────────────────────────────────────────────────── */
export type {
  MediaItem,
  MediaFolder,
  MediaVariant,
  MediaVariantMap,
  MediaVariantMapWithWebP,
  MediaStatus,
  MediaType,
  ImageFormat,
  VariantPreset,
  ViewMode,
  SortField,
  SortDirection,
  TagMode,
  HashAlgorithm,
  StorageProviderType,
  UploadMediaInput,
  UploadFromUrlInput,
  UpdateMediaInput,
  BulkMoveInput,
  BulkDeleteInput,
  BulkTagInput,
  CreateFolderInput,
  DateRange,
  SizeRange,
  MediaFilter,
  MediaSort,
  PaginatedResult,
  VariantPresetConfig,
  MediaConfig,
  MediaAdminSettings,
  ImageMetadata,
  MediaSeoData,
  SitemapImageData,
  MediaSeoAuditResult,
  StorageProvider,
  ImageProcessor,
  MediaPrismaClient,
  MediaCacheProvider,
  MediaLogger,
  UploadProgress,
  UploadQueueState,
  ResolvedMediaAdminSettings,
  MediaManagerProps,
  MediaManagerState,
  MediaManagerAction,
} from './types';

export {
  MEDIA_STATUSES,
  MEDIA_TYPES,
  IMAGE_FORMATS,
  VARIANT_PRESETS,
  VIEW_MODES,
  SORT_FIELDS,
  SORT_DIRECTIONS,
  TAG_MODES,
  HASH_ALGORITHMS,
  STORAGE_PROVIDERS,
  MediaError,
} from './types';

/* ── Constants ───────────────────────────────────────────────────── */
export {
  MEDIA_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  VARIANT_PRESETS_CONFIG,
  CACHE_TTL,
  CACHE_KEYS,
  MEDIA_DEFAULTS,
  FRONTEND_DEFAULTS,
  IMAGE_ALT_MAX_LENGTH,
  IMAGE_TITLE_MAX_LENGTH,
  OG_MIN_WIDTH,
  OG_MIN_HEIGHT,
  getMimeCategory,
  isImageMime,
  isVideoMime,
  isAudioMime,
  generateUniqueFilename,
  getFileExtension,
  sanitizeFilename,
  formatFileSize,
  filenameToSlug,
  isMimeTypeAllowed,
  getMediaTypeIcon,
  getMimeLabel,
  detectMimeFromMagicBytes,
} from './server/constants';

/* ── Schemas (Zod v4) ────────────────────────────────────────────── */
export {
  UploadMediaSchema,
  UploadFromUrlSchema,
  UpdateMediaSchema,
  BulkDeleteSchema,
  BulkMoveSchema,
  BulkTagSchema,
  CreateFolderSchema,
  RenameFolderSchema,
  MediaFilterSchema,
  MediaSortSchema,
  DateRangeSchema,
  SizeRangeSchema,
  MediaAdminSettingsSchema,
  FrontendSettingsSchema,
} from './server/schemas';

export type {
  UploadMediaPayload,
  UploadFromUrlPayload,
  UpdateMediaPayload,
  BulkDeletePayload,
  BulkMovePayload,
  BulkTagPayload,
  CreateFolderPayload,
  RenameFolderPayload,
  MediaFilterPayload,
  MediaSortPayload,
  MediaAdminSettingsPayload,
  FrontendSettingsPayload,
} from './server/schemas';

/* ── Sanitization ────────────────────────────────────────────────── */
export {
  sanitizeFilename as sanitizeMediaFilename,
  sanitizeFolderName,
  sanitizeAltText,
  sanitizeTitle,
  sanitizeDescription,
  sanitizeTags,
  sanitizeMediaInput,
  sanitizeUrl as sanitizeMediaUrl,
  isPrivateUrl,
  validateUploadUrl,
} from './server/sanitization.util';

/* ── Services ────────────────────────────────────────────────────── */
export { MediaService } from './server/media.service';
export { MediaAdminSettingsService } from './server/admin-settings.service';
export { SharpImageProcessor } from './server/image-processor';

/* ── Events ──────────────────────────────────────────────────────── */
export { MediaEventBus, MediaEvent } from './server/events';

/* ── Storage ─────────────────────────────────────────────────────── */
export { LocalStorageProvider } from './server/storage/local.adapter';
export type { LocalStorageConfig } from './server/storage/local.adapter';
export { S3StorageProvider } from './server/storage/s3.adapter';
export type { S3StorageConfig } from './server/storage/s3.adapter';
