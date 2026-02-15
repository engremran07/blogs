// media-manager/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All TypeScript types, interfaces, enums, and DI contracts for the
// Media Manager component.  **Zero external dependencies** — every symbol is
// pure TypeScript so the file can be consumed by any bundler or runtime.
// ─────────────────────────────────────────────────────────────────────────────

/* ====================================================================== *
 *  Const‑array enums + union types                                       *
 * ====================================================================== */

/** Lifecycle states of a media item. */
export const MEDIA_STATUSES = ['ACTIVE', 'ARCHIVED', 'DELETED'] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

/** High‑level classification of uploaded files. */
export const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** Supported image output formats for variant generation. */
export const IMAGE_FORMATS = ['jpeg', 'png', 'gif', 'webp', 'avif', 'svg'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

/** Named variant presets produced during image optimisation. */
export const VARIANT_PRESETS = ['thumb', 'small', 'medium', 'large', 'og', 'full'] as const;
export type VariantPreset = (typeof VARIANT_PRESETS)[number];

/** View modes for the frontend media browser. */
export const VIEW_MODES = ['grid', 'list'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

/** Fields a media listing can be sorted by. */
export const SORT_FIELDS = ['name', 'size', 'date', 'type'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

/** Sort direction. */
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Tag‑update strategy for bulk operations. */
export const TAG_MODES = ['add', 'replace', 'remove'] as const;
export type TagMode = (typeof TAG_MODES)[number];

/** Supported hash algorithms. */
export const HASH_ALGORITHMS = ['sha256', 'sha512', 'md5'] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

/** Storage provider identifiers. */
export const STORAGE_PROVIDERS = ['local', 's3'] as const;
export type StorageProviderType = (typeof STORAGE_PROVIDERS)[number];

/* ====================================================================== *
 *  Core entity interfaces                                                *
 * ====================================================================== */

/** A single generated image variant (thumbnail, WebP conversion, etc.). */
export interface MediaVariant {
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

/** Map from preset name to its variant data. */
export type MediaVariantMap = Partial<Record<VariantPreset, MediaVariant>>;

/** Extended variant map that may also include WebP companions. */
export type MediaVariantMapWithWebP = Partial<
  Record<VariantPreset | `${VariantPreset}_webp`, MediaVariant>
>;

/**
 * The canonical Media entity persisted in the database.
 * Mirrors the reference Prisma model in prisma‑schema.reference.prisma.
 */
export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  folder: string;
  isOptimized: boolean;
  variants: MediaVariantMapWithWebP | null;
  uploadedById: string | null;
  contentHash: string | null;
  hashAlgorithm: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A folder entity for hierarchical organisation. */
export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  itemCount?: number;
  totalSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

/* ====================================================================== *
 *  Input / payload interfaces                                            *
 * ====================================================================== */

/** Input data for uploading a new media file. */
export interface UploadMediaInput {
  buffer: Buffer | ArrayBuffer | Uint8Array;
  originalName: string;
  mimeType: string;
  size: number;
  folder?: string;
  altText?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

/** Input for uploading from a remote URL. */
export interface UploadFromUrlInput {
  url: string;
  folder?: string;
  altText?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

/** Partial update of a media item's mutable metadata. */
export interface UpdateMediaInput {
  altText?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  folder?: string;
}

/** Payload for bulk‑move operations. */
export interface BulkMoveInput {
  ids: string[];
  targetFolder: string;
}

/** Payload for bulk‑delete operations. */
export interface BulkDeleteInput {
  ids: string[];
}

/** Payload for bulk‑tag operations. */
export interface BulkTagInput {
  ids: string[];
  tags: string[];
  mode: TagMode;
}

/** Create‑folder payload. */
export interface CreateFolderInput {
  name: string;
  parentId?: string;
}

/* ====================================================================== *
 *  Filtering, sorting & pagination                                       *
 * ====================================================================== */

/** Date‑range filter. */
export interface DateRange {
  from?: Date | string;
  to?: Date | string;
}

/** Size‑range filter (bytes). */
export interface SizeRange {
  min?: number;
  max?: number;
}

/** Filter criteria for media listings. */
export interface MediaFilter {
  folder?: string;
  mimeType?: string;
  mediaType?: MediaType;
  tags?: string[];
  sizeRange?: SizeRange;
  dateRange?: DateRange;
  search?: string;
  uploadedById?: string;
  isOptimized?: boolean;
  status?: MediaStatus;
}

/** Sorting descriptor. */
export interface MediaSort {
  field: SortField;
  direction: SortDirection;
}

/** Generic paginated result wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/* ====================================================================== *
 *  Configuration                                                         *
 * ====================================================================== */

/** Variant preset configuration. */
export interface VariantPresetConfig {
  width: number;
  height: number;
  quality: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/** Runtime configuration for the media manager module. */
export interface MediaConfig {
  maxUploadSize: number;
  maxBulkItems: number;
  allowedMimeTypes: string[];
  enableOptimization: boolean;
  enableWebPConversion: boolean;
  enableAvifConversion: boolean;
  variantPresets: Record<VariantPreset, VariantPresetConfig>;
  defaultFolder: string;
  cdnPrefix: string;
  storageProvider: StorageProviderType;
  hashAlgorithm: HashAlgorithm;
  retentionDays: number;
  enableDeduplication: boolean;
  enableSoftDelete: boolean;
}

/** Admin‑level settings stored in the database. */
export interface MediaAdminSettings extends Partial<MediaConfig> {
  id?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/* ====================================================================== *
 *  Image metadata                                                        *
 * ====================================================================== */

/** Metadata extracted from an image buffer. */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  isAnimated?: boolean;
  channels?: number;
  density?: number;
  space?: string;
}

/* ====================================================================== *
 *  SEO integration types                                                 *
 * ====================================================================== */

/**
 * SEO data derived from a media item — designed to feed directly into
 * the existing seo module's `assembleSeoMeta()`, `buildPostEntries()`,
 * and JSON‑LD generators.
 */
export interface MediaSeoData {
  altText: string | null;
  title: string | null;
  url: string;
  width: number | null;
  height: number | null;
  ogImageUrl: string | null;
  ogImageWidth: number | null;
  ogImageHeight: number | null;
  srcSet: string | null;
  sitemapImage: SitemapImageData | null;
}

/**
 * Shape compatible with the seo module's `SitemapImage` interface
 * (`seo/types.ts`).
 */
export interface SitemapImageData {
  loc: string;
  caption?: string;
  title?: string;
  geoLocation?: string;
  license?: string;
}

/**
 * Image‑level audit result produced by the media manager's own SEO
 * checks — supplements the seo module's `checkImagesAndAltText()`.
 */
export interface MediaSeoAuditResult {
  hasAltText: boolean;
  altTextLength: number;
  isOptimized: boolean;
  hasWebPVariant: boolean;
  hasAvifVariant: boolean;
  hasOgVariant: boolean;
  ogDimensionsCorrect: boolean;
  fileSizeWarning: boolean;
  formatWarning: boolean;
  suggestions: string[];
}

/* ====================================================================== *
 *  DI contracts — Prisma                                                 *
 * ====================================================================== */

/**
 * Typed Prisma delegate for the `media` model.
 * Mimics just the shape the service needs — consumers provide their
 * own Prisma client that satisfies this interface.
 */
export interface MediaPrismaDelegate {
  create(args: {
    data: Record<string, unknown>;
  }): Promise<MediaItem>;

  findUnique(args: {
    where: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<MediaItem | null>;

  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    skip?: number;
    take?: number;
    include?: Record<string, unknown>;
  }): Promise<MediaItem[]>;

  findFirst(args: {
    where?: Record<string, unknown>;
  }): Promise<MediaItem | null>;

  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<MediaItem>;

  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;

  delete(args: {
    where: Record<string, unknown>;
  }): Promise<MediaItem>;

  count(args?: {
    where?: Record<string, unknown>;
  }): Promise<number>;

  groupBy(args: {
    by: string[];
    _count?: Record<string, unknown>;
    _sum?: Record<string, unknown>;
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
  }): Promise<Record<string, unknown>[]>;
}

/** Typed Prisma delegate for the `mediaFolder` model. */
export interface MediaFolderPrismaDelegate {
  create(args: {
    data: Record<string, unknown>;
  }): Promise<MediaFolder>;

  findUnique(args: {
    where: Record<string, unknown>;
  }): Promise<MediaFolder | null>;

  findMany(args: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
  }): Promise<MediaFolder[]>;

  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<MediaFolder>;

  delete(args: {
    where: Record<string, unknown>;
  }): Promise<MediaFolder>;

  count(args?: {
    where?: Record<string, unknown>;
  }): Promise<number>;
}

/** Prisma client shape the media manager service requires. */
export interface MediaPrismaClient {
  media: MediaPrismaDelegate;
  mediaFolder: MediaFolderPrismaDelegate;
}

/* ====================================================================== *
 *  DI contracts — Cache                                                  *
 * ====================================================================== */

/**
 * Cache provider interface — identical shape to the blog module's
 * `BlogCacheProvider` for cross‑module consistency.
 */
export interface MediaCacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(pattern: string): Promise<void>;
}

/* ====================================================================== *
 *  DI contracts — Logger                                                 *
 * ====================================================================== */

/** Logger interface with noop fallback pattern (same as seo module). */
export interface MediaLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/* ====================================================================== *
 *  DI contracts — Storage                                                *
 * ====================================================================== */

/** Abstract storage provider — implement for local filesystem, S3, etc. */
export interface StorageProvider {
  /** Upload a buffer to the given path and return the public URL. */
  upload(
    buffer: Buffer | Uint8Array,
    destPath: string,
    contentType?: string,
  ): Promise<string>;

  /** Delete the object at the given path. */
  delete(path: string): Promise<void>;

  /** Return the public URL for the given path. */
  getUrl(path: string): string;

  /** Check whether an object exists at the given path. */
  exists(path: string): Promise<boolean>;

  /**
   * Move (rename) an object from `fromPath` to `toPath`.
   * Returns the new public URL.
   */
  move(fromPath: string, toPath: string): Promise<string>;

  /** Get a readable stream for the object at the given path. */
  getStream(path: string): Promise<NodeJS.ReadableStream>;

  /** List object keys under the given prefix. */
  listFolder(prefix: string): Promise<string[]>;
}

/* ====================================================================== *
 *  DI contracts — Image processor                                        *
 * ====================================================================== */

/**
 * Image processing interface — reference implementation uses `sharp`,
 * but consumers may swap in Cloudinary, imgproxy, etc.
 */
export interface ImageProcessor {
  /** Extract image metadata (dimensions, format, etc.) from a buffer. */
  getMetadata(buffer: Buffer | Uint8Array): Promise<ImageMetadata>;

  /**
   * Generate optimised variants for the given buffer based on preset
   * configurations.  Returns both original‑format and WebP variants.
   */
  generateVariants(
    buffer: Buffer | Uint8Array,
    presets: Record<string, VariantPresetConfig>,
    options?: { webp?: boolean; avif?: boolean },
  ): Promise<{
    variants: MediaVariantMapWithWebP;
    buffers: Map<string, Buffer>;
  }>;

  /** Convert a buffer to a different image format. */
  convertFormat(
    buffer: Buffer | Uint8Array,
    format: ImageFormat,
    quality?: number,
  ): Promise<Buffer>;

  /** Compute a content hash for de‑duplication. */
  computeHash(
    buffer: Buffer | Uint8Array,
    algorithm?: HashAlgorithm,
  ): Promise<string>;

  /**
   * Build a responsive `srcset` string from a variant map.
   * E.g. `"/img/foo-400w.webp 400w, /img/foo-800w.webp 800w"`.
   */
  generateSrcSet(variants: MediaVariantMapWithWebP): string;
}

/* ====================================================================== *
 *  API response envelope                                                 *
 * ====================================================================== */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
}

/* ====================================================================== *
 *  Service dependency bag                                                *
 * ====================================================================== */

/** Callback invoked after mutations to trigger ISR / on‑demand revalidation. */
export type RevalidationCallback = (pathOrTag: string) => Promise<void> | void;

/** Dependencies injected into `MediaService` via its constructor. */
export interface MediaServiceDeps {
  prisma: MediaPrismaClient;
  storage: StorageProvider;
  cache?: MediaCacheProvider;
  logger?: MediaLogger;
  imageProcessor?: ImageProcessor;
  getConfig?: () => Promise<MediaConfig> | MediaConfig;
  revalidate?: RevalidationCallback;
}

/** Dependencies injected into `MediaAdminSettingsService`. */
export interface MediaAdminSettingsServiceDeps {
  prisma: MediaPrismaClient;
  cache?: MediaCacheProvider;
  logger?: MediaLogger;
}

/* ====================================================================== *
 *  Error class                                                           *
 * ====================================================================== */

/**
 * Module‑specific error, following the same pattern as `BlogError`.
 * Carries both a machine‑readable `code` and an HTTP `statusCode`.
 */
export class MediaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'MediaError';
    Object.setPrototypeOf(this, MediaError.prototype);
  }
}

/* ====================================================================== *
 *  Frontend component types                                              *
 * ====================================================================== */

/** Upload progress for a single file. */
export interface UploadProgress {
  id: string;
  filename: string;
  progress: number;       // 0–100
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'failed';
  error?: string;
  mediaItem?: MediaItem;
}

/** Aggregate upload queue state. */
export interface UploadQueueState {
  items: UploadProgress[];
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  isUploading: boolean;
}

/** Resolved admin settings merged with defaults for the frontend. */
export interface ResolvedMediaAdminSettings {
  maxUploadSize: number;
  allowedMimeTypes: string[];
  enableOptimization: boolean;
  enableDragDrop: boolean;
  enablePasteUpload: boolean;
  enableUrlUpload: boolean;
  enableBulkOperations: boolean;
  enableFolders: boolean;
  enableSearch: boolean;
  enableFilters: boolean;
  enableSeoAudit: boolean;
  defaultView: ViewMode;
  gridColumns: number;
  pageSize: number;
}

/** Props for the top‑level `<MediaManager />` component. */
export interface MediaManagerProps {
  /** Upload a file — return the created media item. */
  onUpload: (file: File) => Promise<MediaItem>;

  /** Upload from URL — return the created media item. */
  onUploadFromUrl?: (url: string, meta?: Partial<UpdateMediaInput>) => Promise<MediaItem>;

  /** Delete a single media item. */
  onDelete: (id: string) => Promise<void>;

  /** Bulk‑delete media items. */
  onBulkDelete?: (ids: string[]) => Promise<void>;

  /** Bulk‑move media items to a target folder. */
  onBulkMove?: (ids: string[], folder: string) => Promise<void>;

  /** Update mutable metadata of a media item. */
  onUpdate: (id: string, data: UpdateMediaInput) => Promise<MediaItem>;

  /** List / search media with filtering, sorting, pagination. */
  onList: (
    filter?: MediaFilter,
    sort?: MediaSort,
    page?: number,
    pageSize?: number,
  ) => Promise<PaginatedResult<MediaItem>>;

  /** List available folders. */
  onListFolders?: () => Promise<MediaFolder[]>;

  /** Create a new folder. */
  onCreateFolder?: (name: string) => Promise<MediaFolder>;

  /** Rename a folder. */
  onRenameFolder?: (id: string, name: string) => Promise<MediaFolder>;

  /** Delete a folder. */
  onDeleteFolder?: (id: string) => Promise<void>;

  /** Get srcset string for an image — optional SEO integration. */
  onGetSrcSet?: (item: MediaItem) => string;

  /** Run an SEO audit on a media item. */
  onAuditSeo?: (item: MediaItem) => Promise<MediaSeoAuditResult>;

  /** Download one or more items — consumer handles ZIP generation. */
  onDownload?: (ids: string[]) => Promise<void>;

  /** Called when items are selected in picker mode. */
  onSelect?: (items: MediaItem[]) => void;

  /** `manager` = full UI;  `picker` = embed‑in‑editor selection dialog. */
  mode?: 'manager' | 'picker';

  /** Allow selecting multiple items in picker mode. */
  multiSelect?: boolean;

  /** Admin settings overrides merged with defaults. */
  adminSettings?: Partial<ResolvedMediaAdminSettings>;

  /** Additional CSS class on the root element. */
  className?: string;

  /** Accepted MIME types for the upload input (overrides adminSettings). */
  accept?: string;
}

/**
 * Reducer state for the `<MediaManager />` component.
 * @internal
 */
export interface MediaManagerState {
  viewMode: ViewMode;
  currentFolder: string | null;
  selectedIds: Set<string>;
  items: MediaItem[];
  folders: MediaFolder[];
  totalItems: number;
  page: number;
  pageSize: number;
  search: string;
  filter: MediaFilter;
  sort: MediaSort;
  isLoading: boolean;
  isUploading: boolean;
  uploadQueue: UploadQueueState;
  detailItem: MediaItem | null;
  editItem: MediaItem | null;
  showUploadModal: boolean;
  showDeleteConfirm: boolean;
  deleteTargetIds: string[];
  error: string | null;
  sidebarOpen: boolean;
}

/**
 * Actions dispatched by the media manager reducer.
 * @internal
 */
export type MediaManagerAction =
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_FOLDER'; payload: string | null }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER'; payload: MediaFilter }
  | { type: 'SET_SORT'; payload: MediaSort }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'TOGGLE_SELECT'; payload: string }
  | { type: 'SET_ITEMS'; payload: { items: MediaItem[]; total: number } }
  | { type: 'SET_FOLDERS'; payload: MediaFolder[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DETAIL'; payload: MediaItem | null }
  | { type: 'SET_EDIT'; payload: MediaItem | null }
  | { type: 'SET_UPLOAD_MODAL'; payload: boolean }
  | { type: 'SET_DELETE_CONFIRM'; payload: { show: boolean; ids: string[] } }
  | { type: 'UPDATE_ITEM'; payload: MediaItem }
  | { type: 'REMOVE_ITEMS'; payload: string[] }
  | { type: 'ADD_ITEM'; payload: MediaItem }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_PROGRESS'; payload: UploadProgress }
  | { type: 'UPLOAD_COMPLETE'; payload: UploadProgress }
  | { type: 'UPLOAD_FAILED'; payload: UploadProgress }
  | { type: 'UPLOAD_RESET' };
