/**
 * ============================================================================
 * MODULE:   editor/utils/index.ts
 * PURPOSE:  Barrel export for editor utilities
 * ============================================================================
 */

export { default as logger, setEditorLogger } from './logger';
export type { EditorLogger } from './logger';

export { sanitizeHtml, escapeAttr, escapeHtml } from './sanitizer';

export { EditorErrorBoundary } from './ErrorBoundary';
export type { EditorErrorBoundaryProps } from './ErrorBoundary';
