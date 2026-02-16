/**
 * ============================================================================
 * MODULE:   features/editor/schemas.ts
 * PURPOSE:  Zod validation schemas for editor admin-dynamic settings.
 *           Used by API routes and the admin-settings service to validate
 *           incoming payloads before persisting to DB.
 * ============================================================================
 */

import { z } from 'zod';

// ─── Reusable Atoms ─────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex colour');

const headingLevel = z.number().int().min(1).max(6);

const videoProvider = z.enum(['youtube', 'vimeo']);

const imageType = z.string().regex(
  /^image\/(jpeg|png|gif|webp|svg\+xml|avif|bmp|tiff)$/,
  'Must be a valid image MIME type',
);

const positiveIntOrZero = z.number().int().min(0);
const positiveInt = z.number().int().min(1);

const cssLength = z.string().regex(
  /^\d+(\.\d+)?(px|em|rem|vh|vw|%)$/,
  'Must be a valid CSS length (e.g. "300px", "50vh")',
);

// ─── Update Editor Settings (Admin Panel) ───────────────────────────────────

/**
 * Schema for PATCH /api/admin/editor/settings
 * All fields optional — omitted fields keep current DB values.
 */
export const updateEditorSettingsSchema = z.object({
  // Global
  editorEnabled: z.boolean().optional(),

  // Feature toggles
  enableBold: z.boolean().optional(),
  enableItalic: z.boolean().optional(),
  enableUnderline: z.boolean().optional(),
  enableStrikethrough: z.boolean().optional(),
  enableHeadings: z.boolean().optional(),
  allowedHeadingLevels: z
    .array(headingLevel)
    .min(1, 'At least one heading level required')
    .max(6)
    .optional(),
  enableLists: z.boolean().optional(),
  enableTaskLists: z.boolean().optional(),
  enableBlockquotes: z.boolean().optional(),
  enableCodeBlocks: z.boolean().optional(),
  enableInlineCode: z.boolean().optional(),
  enableLinks: z.boolean().optional(),
  enableImages: z.boolean().optional(),
  enableVideoEmbeds: z.boolean().optional(),
  enableTables: z.boolean().optional(),
  enableHorizontalRule: z.boolean().optional(),
  enableTextColor: z.boolean().optional(),
  enableBackgroundColor: z.boolean().optional(),
  enableAlignment: z.boolean().optional(),
  enableFullscreen: z.boolean().optional(),
  enableUndoRedo: z.boolean().optional(),
  enableMarkdownShortcuts: z.boolean().optional(),
  enableDragDropUpload: z.boolean().optional(),

  // Content limits
  maxWordCount: positiveIntOrZero
    .max(1_000_000, 'Max word count cannot exceed 1,000,000')
    .optional(),
  maxCharCount: positiveIntOrZero
    .max(10_000_000, 'Max char count cannot exceed 10,000,000')
    .optional(),

  // Image upload
  maxImageSizeBytes: positiveInt
    .max(100 * 1024 * 1024, 'Max image size cannot exceed 100 MB')
    .optional(),
  allowedImageTypes: z
    .array(imageType)
    .min(1, 'At least one image type required')
    .max(20)
    .optional(),
  defaultImageWidth: positiveInt.max(10_000).optional(),
  defaultImageHeight: positiveInt.max(10_000).optional(),

  // Video embeds
  allowedVideoProviders: z
    .array(videoProvider)
    .min(1, 'At least one video provider required')
    .max(10)
    .optional(),

  // Table limits
  maxTableRows: positiveInt.max(100, 'Max table rows cannot exceed 100').optional(),
  maxTableCols: positiveInt.max(50, 'Max table cols cannot exceed 50').optional(),

  // Color palette
  colorPalette: z
    .array(hexColor)
    .min(1, 'At least one colour required')
    .max(120, 'Max 120 colours')
    .optional(),
  defaultTextColor: hexColor.optional(),

  // Editor behaviour
  maxHistorySize: positiveInt
    .max(500, 'Max history size cannot exceed 500')
    .optional(),
  autoSaveDebounceMs: positiveInt
    .max(60_000, 'Auto-save debounce cannot exceed 60 seconds')
    .optional(),
  readingWpm: positiveInt
    .max(1_000, 'Reading WPM cannot exceed 1000')
    .optional(),
  defaultPlaceholder: z
    .string()
    .max(500, 'Placeholder cannot exceed 500 characters')
    .optional(),
  defaultMinHeight: cssLength.optional(),
  defaultMaxHeight: cssLength.optional(),
}).strict();

export type UpdateEditorSettingsInput = z.infer<typeof updateEditorSettingsSchema>;

// ─── Frontend Settings Response ─────────────────────────────────────────────

/**
 * Schema for GET /api/editor/settings (public, consumed by frontend).
 * This is a sanitised subset — no internal IDs or audit fields.
 */
export const editorFrontendSettingsSchema = z.object({
  editorEnabled: z.boolean(),

  // Feature toggles
  enableBold: z.boolean(),
  enableItalic: z.boolean(),
  enableUnderline: z.boolean(),
  enableStrikethrough: z.boolean(),
  enableHeadings: z.boolean(),
  allowedHeadingLevels: z.array(headingLevel),
  enableLists: z.boolean(),
  enableTaskLists: z.boolean(),
  enableBlockquotes: z.boolean(),
  enableCodeBlocks: z.boolean(),
  enableInlineCode: z.boolean(),
  enableLinks: z.boolean(),
  enableImages: z.boolean(),
  enableVideoEmbeds: z.boolean(),
  enableTables: z.boolean(),
  enableHorizontalRule: z.boolean(),
  enableTextColor: z.boolean(),
  enableBackgroundColor: z.boolean(),
  enableAlignment: z.boolean(),
  enableFullscreen: z.boolean(),
  enableUndoRedo: z.boolean(),
  enableMarkdownShortcuts: z.boolean(),
  enableDragDropUpload: z.boolean(),

  // Content limits
  maxWordCount: positiveIntOrZero,
  maxCharCount: positiveIntOrZero,

  // Image upload
  maxImageSizeBytes: positiveInt,
  allowedImageTypes: z.array(z.string()),
  defaultImageWidth: positiveInt,
  defaultImageHeight: positiveInt,

  // Video embeds
  allowedVideoProviders: z.array(z.string()),

  // Table limits
  maxTableRows: positiveInt,
  maxTableCols: positiveInt,

  // Color palette
  colorPalette: z.array(hexColor),
  defaultTextColor: hexColor,

  // Editor behaviour
  maxHistorySize: positiveInt,
  autoSaveDebounceMs: positiveInt,
  readingWpm: positiveInt,
  defaultPlaceholder: z.string(),
  defaultMinHeight: z.string(),
  defaultMaxHeight: z.string(),
});

export type EditorFrontendSettings = z.infer<typeof editorFrontendSettingsSchema>;

// ─── Content Validation ─────────────────────────────────────────────────────

/**
 * Schema for validating editor content before save.
 * Can be used both client-side and server-side.
 */
export const editorContentSchema = z.object({
  /** The HTML content string. */
  html: z.string().max(10_000_000, 'Content too large'),
  /** Optional plain-text extract. */
  text: z.string().optional(),
  /** Word count reported by the editor. */
  wordCount: positiveIntOrZero.optional(),
  /** Char count reported by the editor. */
  charCount: positiveIntOrZero.optional(),
});

export type EditorContentInput = z.infer<typeof editorContentSchema>;
