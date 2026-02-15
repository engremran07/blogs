/**
 * ============================================================================
 * MODULE:   captcha/utils/scriptLoader.ts
 * PURPOSE:  Shared, de-duplicated, CSP-aware script loader for all CAPTCHA
 *           providers. Eliminates the copy-pasted script injection logic.
 *
 * FEATURES:
 *   - Singleton per script URL (never appends the same script twice)
 *   - Optional CSP nonce injection
 *   - Configurable timeout with automatic cleanup
 *   - Promise-based API — callers can await loading
 *   - Cancellation support via AbortSignal
 * ============================================================================
 */

import logger from './logger';

export interface ScriptLoadOptions {
  /** DOM id for the <script> element (dedup key). */
  id: string;
  /** Full script URL. */
  src: string;
  /** Optional CSP nonce value. */
  nonce?: string;
  /** Timeout in ms before treating load as failure. Default: 10 000. */
  timeoutMs?: number;
  /** AbortSignal to cancel loading. */
  signal?: AbortSignal;
}

/* In-flight / completed loads keyed by script id. */
const loadCache = new Map<string, Promise<void>>();

/**
 * Load an external script into `<head>`, de-duplicated by `id`.
 * Resolves when the script's `onload` fires, rejects on error or timeout.
 */
export function loadScript(opts: ScriptLoadOptions): Promise<void> {
  const { id, src, nonce, timeoutMs = 10_000, signal } = opts;

  /* Already loaded or in-flight — return existing promise */
  const cached = loadCache.get(id);
  if (cached) return cached;

  /* Script element already in DOM (e.g. added by another module) */
  if (typeof document !== 'undefined' && document.getElementById(id)) {
    const resolved = Promise.resolve();
    loadCache.set(id, resolved);
    return resolved;
  }

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('loadScript called in non-browser environment'));
      return;
    }

    if (signal?.aborted) {
      reject(new DOMException('Script load aborted', 'AbortError'));
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    if (nonce) script.nonce = nonce;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      script.remove();
      loadCache.delete(id);
      reject(new DOMException('Script load aborted', 'AbortError'));
    };

    script.onload = () => {
      cleanup();
      logger.debug(`Script loaded: ${id}`);
      resolve();
    };

    script.onerror = () => {
      cleanup();
      script.remove();
      loadCache.delete(id);
      const err = new Error(`Failed to load script: ${src}`);
      logger.warn(err.message);
      reject(err);
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    timer = setTimeout(() => {
      script.remove();
      loadCache.delete(id);
      signal?.removeEventListener('abort', onAbort);
      const err = new Error(`Script load timed out after ${timeoutMs}ms: ${src}`);
      logger.warn(err.message);
      reject(err);
    }, timeoutMs);

    document.head.appendChild(script);
  });

  loadCache.set(id, promise);
  return promise;
}

/**
 * Poll for a global variable to become available.
 * Useful after script load when the SDK initialises asynchronously.
 */
export function pollForGlobal<T>(
  accessor: () => T | undefined,
  opts: { intervalMs?: number; maxAttempts?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const { intervalMs = 200, maxAttempts = 50, signal } = opts;

  return new Promise<T>((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      if (signal?.aborted) {
        reject(new DOMException('Polling aborted', 'AbortError'));
        return;
      }

      const value = accessor();
      if (value !== undefined) {
        resolve(value);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        reject(new Error(`Global not available after ${maxAttempts} polls`));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
}

/**
 * Remove a cached script entry (for testing or hot-reload scenarios).
 */
export function clearScriptCache(id?: string): void {
  if (id) {
    loadCache.delete(id);
  } else {
    loadCache.clear();
  }
}
