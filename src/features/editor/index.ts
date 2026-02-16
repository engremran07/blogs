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
 *   RichTextEditor.tsx           — Main component (contentEditable + toolbar)
 *   editor.css                   — Scoped styles with CSS custom properties
 *   types.ts                     — TypeScript interfaces
 *   constants.ts                 — Editor-specific constants (palette, shortcuts)
 *   schemas.ts                   — Zod validation schemas
 *   admin-settings.service.ts    — DB-backed admin settings service
 *   prisma-schema.reference.prisma — Reference Prisma model
 *   utils/                       — Logger, sanitizer, error boundary
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
