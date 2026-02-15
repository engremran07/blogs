// media-manager/schemas.ts
// ─────────────────────────────────────────────────────────────────────────────
// Zod v4 validation schemas for every user‑facing payload.
// Imports const arrays from `types.ts` and limits from `constants.ts`.
// Each schema is paired with an inferred `*Payload` type.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

import {
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
} from '../types';

import {
  MEDIA_LIMITS,
  ALL_ALLOWED_MIME_TYPES,
} from './constants';

/* ====================================================================== *
 *  Reusable primitives                                                   *
 * ====================================================================== */

const uuidString = z.string().uuid();
const nonEmptyString = z.string().min(1, 'Must not be empty');

const tagItem = z
  .string()
  .min(1)
  .max(MEDIA_LIMITS.MAX_TAG_LENGTH, `Tag must be ≤ ${MEDIA_LIMITS.MAX_TAG_LENGTH} characters`)
  .transform((v) => v.trim().toLowerCase());

const tagsArray = z
  .array(tagItem)
  .max(MEDIA_LIMITS.MAX_TAGS, `Maximum ${MEDIA_LIMITS.MAX_TAGS} tags`)
  .optional();

/**
 * Folder‑name validation:
 * - No path traversal (`..`)
 * - No absolute paths (`/` or `\` at start)
 * - No special filesystem characters
 * - Reasonable length
 */
const folderName = z
  .string()
  .min(1, 'Folder name required')
  .max(MEDIA_LIMITS.MAX_FOLDER_NAME_LENGTH, `Folder name must be ≤ ${MEDIA_LIMITS.MAX_FOLDER_NAME_LENGTH} characters`)
  .refine((v) => !v.includes('..'), 'Path traversal not allowed')
  .refine((v) => !/^[/\\]/.test(v), 'Absolute paths not allowed')
  .refine((v) => !/[<>:"|?*\x00-\x1f]/.test(v), 'Invalid characters in folder name')
  .transform((v) => v.trim().replace(/[/\\]+$/, ''));

/* ====================================================================== *
 *  Upload schemas                                                        *
 * ====================================================================== */

/** Schema for single‑file upload metadata. */
export const UploadMediaSchema = z.object({
  originalName: nonEmptyString
    .max(MEDIA_LIMITS.MAX_FILENAME_LENGTH, `Filename must be ≤ ${MEDIA_LIMITS.MAX_FILENAME_LENGTH} characters`),

  mimeType: z
    .string()
    .refine(
      (v) => ALL_ALLOWED_MIME_TYPES.includes(v.toLowerCase()),
      { message: 'Unsupported file type' },
    ),

  size: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(MEDIA_LIMITS.MAX_FILE_SIZE, `File must be ≤ ${MEDIA_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`),

  folder: folderName.optional(),

  altText: z
    .string()
    .max(MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH, `Alt text must be ≤ ${MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH} characters`)
    .optional(),

  title: z
    .string()
    .max(MEDIA_LIMITS.MAX_TITLE_LENGTH, `Title must be ≤ ${MEDIA_LIMITS.MAX_TITLE_LENGTH} characters`)
    .optional(),

  description: z
    .string()
    .max(MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH, `Description must be ≤ ${MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH} characters`)
    .optional(),

  tags: tagsArray,
});

export type UploadMediaPayload = z.infer<typeof UploadMediaSchema>;

/* ====================================================================== *
 *  Upload‑from‑URL schema                                               *
 * ====================================================================== */

/**
 * SSRF‑safe URL validation:
 * - Must be valid `http` / `https`
 * - Blocks `data:`, `javascript:`, `vbscript:`, `file:` protocols
 * - Blocks private / reserved IP ranges (detailed runtime check in
 *   `sanitization.util.ts`)
 */
export const UploadFromUrlSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (v) => /^https?:\/\//i.test(v),
      'Only HTTP and HTTPS URLs are allowed',
    )
    .refine(
      (v) => !/^(data|javascript|vbscript|file):/i.test(v),
      'Dangerous protocol not allowed',
    ),

  folder: folderName.optional(),

  altText: z
    .string()
    .max(MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH)
    .optional(),

  title: z
    .string()
    .max(MEDIA_LIMITS.MAX_TITLE_LENGTH)
    .optional(),

  description: z
    .string()
    .max(MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH)
    .optional(),

  tags: tagsArray,
});

export type UploadFromUrlPayload = z.infer<typeof UploadFromUrlSchema>;

/* ====================================================================== *
 *  Update‑media schema                                                   *
 * ====================================================================== */

export const UpdateMediaSchema = z.object({
  altText: z
    .string()
    .max(MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH, `Alt text must be ≤ ${MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH} characters`)
    .nullable()
    .optional(),

  title: z
    .string()
    .max(MEDIA_LIMITS.MAX_TITLE_LENGTH, `Title must be ≤ ${MEDIA_LIMITS.MAX_TITLE_LENGTH} characters`)
    .nullable()
    .optional(),

  description: z
    .string()
    .max(MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH, `Description must be ≤ ${MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH} characters`)
    .nullable()
    .optional(),

  tags: tagsArray,

  folder: folderName.optional(),
});

export type UpdateMediaPayload = z.infer<typeof UpdateMediaSchema>;

/* ====================================================================== *
 *  Bulk operation schemas                                                *
 * ====================================================================== */

export const BulkDeleteSchema = z.object({
  ids: z
    .array(uuidString)
    .min(1, 'At least one ID required')
    .max(MEDIA_LIMITS.MAX_BULK_ITEMS, `Maximum ${MEDIA_LIMITS.MAX_BULK_ITEMS} items per bulk operation`),
});

export type BulkDeletePayload = z.infer<typeof BulkDeleteSchema>;

export const BulkMoveSchema = z.object({
  ids: z
    .array(uuidString)
    .min(1, 'At least one ID required')
    .max(MEDIA_LIMITS.MAX_BULK_ITEMS, `Maximum ${MEDIA_LIMITS.MAX_BULK_ITEMS} items per bulk operation`),

  targetFolder: folderName,
});

export type BulkMovePayload = z.infer<typeof BulkMoveSchema>;

export const BulkTagSchema = z.object({
  ids: z
    .array(uuidString)
    .min(1, 'At least one ID required')
    .max(MEDIA_LIMITS.MAX_BULK_ITEMS),

  tags: z
    .array(tagItem)
    .min(1, 'At least one tag required')
    .max(MEDIA_LIMITS.MAX_TAGS),

  mode: z.enum(TAG_MODES),
});

export type BulkTagPayload = z.infer<typeof BulkTagSchema>;

/* ====================================================================== *
 *  Folder schema                                                         *
 * ====================================================================== */

export const CreateFolderSchema = z.object({
  name: folderName,
  parentId: uuidString.optional(),
});

export type CreateFolderPayload = z.infer<typeof CreateFolderSchema>;

export const RenameFolderSchema = z.object({
  name: folderName,
});

export type RenameFolderPayload = z.infer<typeof RenameFolderSchema>;

/* ====================================================================== *
 *  Filter & sort schemas                                                 *
 * ====================================================================== */

export const DateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (v) => {
    if (v.from && v.to) return v.from <= v.to;
    return true;
  },
  { message: '"from" must be before or equal to "to"' },
);

export const SizeRangeSchema = z.object({
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().positive().optional(),
}).refine(
  (v) => {
    if (v.min != null && v.max != null) return v.min <= v.max;
    return true;
  },
  { message: 'Min size must be ≤ max size' },
);

export const MediaFilterSchema = z.object({
  folder:       folderName.optional(),
  mimeType:     z.string().optional(),
  mediaType:    z.enum(MEDIA_TYPES).optional(),
  tags:         z.array(z.string()).optional(),
  sizeRange:    SizeRangeSchema.optional(),
  dateRange:    DateRangeSchema.optional(),
  search:       z.string().min(MEDIA_LIMITS.MIN_SEARCH_LENGTH).max(MEDIA_LIMITS.MAX_SEARCH_LENGTH).optional(),
  uploadedById: uuidString.optional(),
  isOptimized:  z.boolean().optional(),
  status:       z.enum(MEDIA_STATUSES).optional(),
});

export type MediaFilterPayload = z.infer<typeof MediaFilterSchema>;

export const MediaSortSchema = z.object({
  field:     z.enum(SORT_FIELDS),
  direction: z.enum(SORT_DIRECTIONS),
});

export type MediaSortPayload = z.infer<typeof MediaSortSchema>;

/* ====================================================================== *
 *  Admin settings schema                                                 *
 * ====================================================================== */

const VariantPresetConfigSchema = z.object({
  width:   z.number().int().min(1).max(10000),
  height:  z.number().int().min(1).max(10000),
  quality: z.number().int().min(1).max(100),
  fit:     z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
});

export const MediaAdminSettingsSchema = z.object({
  maxUploadSize: z
    .number()
    .int()
    .min(1024, 'Must be at least 1 KB')
    .max(500 * 1024 * 1024, 'Must be ≤ 500 MB')
    .optional(),

  allowedMimeTypes: z
    .array(z.string())
    .min(1, 'At least one MIME type required')
    .optional(),

  enableOptimization:   z.boolean().optional(),
  enableWebPConversion: z.boolean().optional(),
  enableAvifConversion: z.boolean().optional(),

  variantPresets: z
    .record(z.enum(VARIANT_PRESETS), VariantPresetConfigSchema)
    .optional(),

  defaultFolder: folderName.optional(),

  cdnPrefix: z
    .string()
    .url()
    .optional()
    .or(z.literal('')),

  storageProvider: z.enum(STORAGE_PROVIDERS).optional(),

  hashAlgorithm: z.enum(HASH_ALGORITHMS).optional(),

  retentionDays: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .optional(),

  enableDeduplication: z.boolean().optional(),
  enableSoftDelete:    z.boolean().optional(),
});

export type MediaAdminSettingsPayload = z.infer<typeof MediaAdminSettingsSchema>;

/* ====================================================================== *
 *  Frontend settings schema                                              *
 * ====================================================================== */

export const FrontendSettingsSchema = z.object({
  maxUploadSize:        z.number().int().positive().optional(),
  allowedMimeTypes:     z.array(z.string()).optional(),
  enableOptimization:   z.boolean().optional(),
  enableDragDrop:       z.boolean().optional(),
  enablePasteUpload:    z.boolean().optional(),
  enableUrlUpload:      z.boolean().optional(),
  enableBulkOperations: z.boolean().optional(),
  enableFolders:        z.boolean().optional(),
  enableSearch:         z.boolean().optional(),
  enableFilters:        z.boolean().optional(),
  enableSeoAudit:       z.boolean().optional(),
  defaultView:          z.enum(VIEW_MODES).optional(),
  gridColumns:          z.number().int().min(1).max(8).optional(),
  pageSize:             z.number().int().min(1).max(MEDIA_LIMITS.MAX_PAGE_SIZE).optional(),
});

export type FrontendSettingsPayload = z.infer<typeof FrontendSettingsSchema>;
