/**
 * ============================================================================
 * MODULE:   captcha/utils/logger.ts
 * PURPOSE:  Self-contained logger for the CAPTCHA module.
 *           Removes dependency on @/lib/logger so this module can be
 *           extracted to a standalone package.
 *
 * BEHAVIOUR:
 *   - In production: logs warnings and errors via console.warn / console.error
 *   - In development: also logs info and debug messages
 *   - All messages are prefixed with [Captcha] for easy filtering
 *   - Structured metadata is appended as a plain object
 *
 * OVERRIDE:
 *   Call `setLogger(customLogger)` to replace the default implementation
 *   with your own (e.g. your app's centralized logger, Sentry, DataDog).
 * ============================================================================
 */

export interface CaptchaLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const PREFIX = '[Captcha]';

const IS_DEV =
  typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? (process as { env: Record<string, string | undefined> }).env.NODE_ENV !== 'production'
    : typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__DEV__ === true;

/* ── noop for suppressed levels ── */
const noop = (): void => {};

const defaultLogger: CaptchaLogger = {
  debug: IS_DEV
    ? (msg, ...args) => console.debug(PREFIX, msg, ...args)
    : noop,
  info: IS_DEV
    ? (msg, ...args) => console.info(PREFIX, msg, ...args)
    : noop,
  warn: (msg, ...args) => console.warn(PREFIX, msg, ...args),
  error: (msg, ...args) => console.error(PREFIX, msg, ...args),
};

let activeLogger: CaptchaLogger = defaultLogger;

/**
 * Replace the built-in console logger with a custom implementation.
 * Pass `null` to restore the default.
 */
export function setLogger(custom: CaptchaLogger | null): void {
  activeLogger = custom ?? defaultLogger;
}

/** Module-scoped logger singleton. */
const logger: CaptchaLogger = {
  debug: (...args) => activeLogger.debug(...args),
  info: (...args) => activeLogger.info(...args),
  warn: (...args) => activeLogger.warn(...args),
  error: (...args) => activeLogger.error(...args),
};

export default logger;
