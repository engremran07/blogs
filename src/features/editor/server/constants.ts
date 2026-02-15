/**
 * ============================================================================
 * MODULE:   components/editor/constants.ts
 * PURPOSE:  Editor-specific constants isolated from global design tokens.
 *           When this module is extracted to a separate repo, consumers
 *           provide their own palette via props or override this file.
 * ============================================================================
 */

import type { EditorConfig } from '../types';

/** Default text color for the editor. */
export const EDITOR_DEFAULT_COLOR = '#000000';

/**
 * Preset color palette available in the editor's color picker.
 * Extended palette with semantic grouping.
 */
export const EDITOR_COLOR_PALETTE = [
  /* Neutrals */
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  /* Primary */
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6',
  /* Deeper */
  '#c0392b', '#d35400', '#f39c12', '#27ae60', '#2980b9', '#8e44ad',
  /* Pastels */
  '#fadbd8', '#fdebd0', '#fef9e7', '#d5f5e3', '#d6eaf8', '#ebdef0',
] as const;

/**
 * Editor keyboard shortcut map.
 * Key format: modifier+key (e.g. 'ctrl+k', 'ctrl+shift+e')
 */
export const EDITOR_SHORTCUTS = {
  UNDO: 'ctrl+z',
  REDO_1: 'ctrl+shift+z',
  REDO_2: 'ctrl+y',
  LINK: 'ctrl+k',
  INLINE_CODE: 'ctrl+shift+e',
  BOLD: 'ctrl+b',
  ITALIC: 'ctrl+i',
  UNDERLINE: 'ctrl+u',
} as const;

/**
 * Markdown-style shortcuts supported in the editor.
 * These trigger on space key after typing the pattern at the start of a line.
 */
export const MARKDOWN_SHORTCUTS = {
  HEADING: /^(#{1,6})\s$/,
  BULLET_LIST: /^[-*]\s$/,
  ORDERED_LIST: /^1\.\s$/,
  BLOCKQUOTE: /^>\s$/,
  HORIZONTAL_RULE: /^(---|___|\*\*\*)\s*$/,
  CODE_BLOCK: /^```\s*$/,
} as const;

/** Maximum undo/redo history stack size. */
export const MAX_HISTORY_SIZE = 50;

/** Auto-save debounce interval in milliseconds. */
export const AUTOSAVE_DEBOUNCE_MS = 2_000;

/** Words per minute for reading time calculation. */
export const READING_WPM = 200;

/** Default image dimensions for SEO-optimized insertions. */
export const DEFAULT_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 675,
} as const;

// ─── Admin-Dynamic Default Config ───────────────────────────────────────────

/** Default allowed MIME types for image upload. */
export const DEFAULT_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** Default allowed video embed providers. */
export const DEFAULT_ALLOWED_VIDEO_PROVIDERS = [
  'youtube',
  'vimeo',
] as const;

/** Max image upload size in bytes (10 MB). */
export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Default heading levels available. */
export const DEFAULT_ALLOWED_HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** Default table size limits. */
export const DEFAULT_MAX_TABLE_ROWS = 20;
export const DEFAULT_MAX_TABLE_COLS = 10;

/**
 * Complete default configuration for the editor module.
 * These defaults match the current hard-coded behaviour, so upgrading
 * from the non-admin version to the admin version is a no-op.
 */
export const DEFAULT_EDITOR_CONFIG: Required<EditorConfig> = {
  // Global
  editorEnabled: true,

  // Feature toggles
  enableBold: true,
  enableItalic: true,
  enableUnderline: true,
  enableStrikethrough: true,
  enableHeadings: true,
  allowedHeadingLevels: [...DEFAULT_ALLOWED_HEADING_LEVELS],
  enableLists: true,
  enableTaskLists: true,
  enableBlockquotes: true,
  enableCodeBlocks: true,
  enableInlineCode: true,
  enableLinks: true,
  enableImages: true,
  enableVideoEmbeds: true,
  enableTables: true,
  enableHorizontalRule: true,
  enableTextColor: true,
  enableBackgroundColor: true,
  enableAlignment: true,
  enableFullscreen: true,
  enableUndoRedo: true,
  enableMarkdownShortcuts: true,
  enableDragDropUpload: true,

  // Content limits (0 = unlimited)
  maxWordCount: 0,
  maxCharCount: 0,

  // Image upload
  maxImageSizeBytes: DEFAULT_MAX_IMAGE_SIZE_BYTES,
  allowedImageTypes: [...DEFAULT_ALLOWED_IMAGE_TYPES],
  defaultImageWidth: DEFAULT_IMAGE_DIMENSIONS.width,
  defaultImageHeight: DEFAULT_IMAGE_DIMENSIONS.height,

  // Video embeds
  allowedVideoProviders: [...DEFAULT_ALLOWED_VIDEO_PROVIDERS],

  // Table limits
  maxTableRows: DEFAULT_MAX_TABLE_ROWS,
  maxTableCols: DEFAULT_MAX_TABLE_COLS,

  // Color palette
  colorPalette: [...EDITOR_COLOR_PALETTE],
  defaultTextColor: EDITOR_DEFAULT_COLOR,

  // Editor behaviour
  maxHistorySize: MAX_HISTORY_SIZE,
  autoSaveDebounceMs: AUTOSAVE_DEBOUNCE_MS,
  readingWpm: READING_WPM,
  defaultPlaceholder: 'Start writing your content here...',
  defaultMinHeight: '300px',
  defaultMaxHeight: '600px',
};
