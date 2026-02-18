/**
 * ============================================================================
 * MODULE:   editor/index.ts
 * PURPOSE:  Public API barrel for the pluggable Rich Text Editor module
 *
 * USAGE:
 *   import RichTextEditor from '@/features/editor';
 *   import type { RichTextEditorProps } from '@/features/editor';
 *   import { EditorAdminSettingsService } from '@/features/editor';
 *
 * This module is designed with clear boundaries so it can be extracted
 * to a standalone repository (@yourorg/rich-text-editor) in the future.
 *
 * FILES:
 *   ui/
 *     RichTextEditor.tsx           — Slim orchestrator (composes hooks + components)
 *     editor.css                   — Scoped styles with CSS custom properties
 *     editor.icons.ts              — Centralised lucide-react icon re-exports
 *     editor.config.ts             — Admin-settings merger + MergedEditorConfig type
 *     hooks/
 *       useEditor.ts               — Composition hook (wires core + input + actions)
 *       useEditorCore.ts           — Refs, metrics, history, undo/redo, execCommand
 *       useEditorInput.ts          — Input handling, paste, drag-and-drop
 *       useEditorActions.ts        — Formatting, insertions, blocks, image toolbar
 *     components/
 *       EditorToolbar.tsx           — All toolbar groups
 *       EditorContent.tsx           — Content area, source view, image context toolbar
 *       FindReplaceBar.tsx          — Find & replace bar
 *       EditorDialogs.tsx           — Link, Image, Video, Color, Table dialogs
 *   types.ts                       — TypeScript interfaces
 *   server/
 *     constants.ts                  — Editor-specific constants (palette, shortcuts)
 *     schemas.ts                    — Zod validation schemas
 *     admin-settings.service.ts     — DB-backed admin settings service
 *   utils/                          — Logger, sanitizer, error boundary
 * ============================================================================
 */

/* ── Main component ── */
export { default } from './ui/RichTextEditor';

/* ── Types ── */
export type {
  RichTextEditorProps,
  EditorAdminProps,
  EditorColorConfig,
  EditorLinkData,
  EditorImageData,
  EditorVideoData,
  EditorTableData,
  EditorFormattingState,
  EditorMetrics,
  EditorConfig,
  EditorSystemSettings,
  EditorConfigConsumer,
  EditorPrismaClient,
  EditorPrismaDelegate,
  ApiSuccess,
  ApiError,
  ApiResponse,
} from './types';

/* ── Constants ── */
export {
  EDITOR_DEFAULT_COLOR,
  EDITOR_COLOR_PALETTE,
  EDITOR_SHORTCUTS,
  MARKDOWN_SHORTCUTS,
  MAX_HISTORY_SIZE,
  AUTOSAVE_DEBOUNCE_MS,
  READING_WPM,
  DEFAULT_IMAGE_DIMENSIONS,
  DEFAULT_EDITOR_CONFIG,
  DEFAULT_ALLOWED_IMAGE_TYPES,
  DEFAULT_ALLOWED_VIDEO_PROVIDERS,
  DEFAULT_MAX_IMAGE_SIZE_BYTES,
  DEFAULT_ALLOWED_HEADING_LEVELS,
  DEFAULT_MAX_TABLE_ROWS,
  DEFAULT_MAX_TABLE_COLS,
  FONT_SIZE_PRESETS,
  LINE_HEIGHT_PRESETS,
  SPECIAL_CHARS,
  BLOCK_TYPE_OPTIONS,
  CONTENT_TEMPLATES,
} from './server/constants';

/* ── Schemas ── */
export {
  updateEditorSettingsSchema,
  editorFrontendSettingsSchema,
  editorContentSchema,
} from './server/schemas';
export type {
  UpdateEditorSettingsInput,
  EditorFrontendSettings,
  EditorContentInput,
} from './server/schemas';

/* ── Admin Settings Service ── */
export { EditorAdminSettingsService } from './server/admin-settings.service';

/* ── Utilities (for advanced consumers / testing) ── */
export { setEditorLogger } from './utils/logger';
export type { EditorLogger } from './utils/logger';
export { sanitizeHtml, escapeAttr, escapeHtml } from './utils/sanitizer';
export { EditorErrorBoundary } from './utils/ErrorBoundary';
export type { EditorErrorBoundaryProps } from './utils/ErrorBoundary';
