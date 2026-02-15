/**
 * ============================================================================
 * MODULE:   editor/utils/logger.ts
 * PURPOSE:  Self-contained logger for the Rich Text Editor module.
 *           Removes dependency on @/lib/logger so this module can be
 *           extracted to a standalone package.
 *
 * OVERRIDE:
 *   Call `setEditorLogger(customLogger)` to replace the default.
 * ============================================================================
 */

export interface EditorLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const PREFIX = '[RichTextEditor]';

const IS_DEV =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? (process as { env: Record<string, string | undefined> }).env.NODE_ENV !== 'production'
    : typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__DEV__ === true;

const noop = (): void => {};

const defaultLogger: EditorLogger = {
  debug: IS_DEV ? (msg, ...a) => console.debug(PREFIX, msg, ...a) : noop,
  info: IS_DEV ? (msg, ...a) => console.info(PREFIX, msg, ...a) : noop,
  warn: (msg, ...a) => console.warn(PREFIX, msg, ...a),
  error: (msg, ...a) => console.error(PREFIX, msg, ...a),
};

let activeLogger: EditorLogger = defaultLogger;

export function setEditorLogger(custom: EditorLogger | null): void {
  activeLogger = custom ?? defaultLogger;
}

const logger: EditorLogger = {
  debug: (...args) => activeLogger.debug(...args),
  info: (...args) => activeLogger.info(...args),
  warn: (...args) => activeLogger.warn(...args),
  error: (...args) => activeLogger.error(...args),
};

export default logger;
