/**
 * ============================================================================
 * MODULE:   captcha/providers/CloudflareTurnstile.tsx
 * PURPOSE:  Cloudflare Turnstile provider (privacy-first, latest standard)
 * BOUNDARY: Self-contained — loads its own script, renders widget, cleans up.
 * ============================================================================
 */

'use client';

import { useEffect, useRef, memo } from 'react';
import type { KeyedCaptchaProviderProps } from '../../types';
import { loadScript, pollForGlobal, logger } from '../../utils';
import {
  TURNSTILE_SCRIPT_ID,
  TURNSTILE_SCRIPT_URL,
  SCRIPT_LOAD_TIMEOUT_MS,
} from '../../utils/constants';

type TurnstileAPI = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

function getTurnstile(): TurnstileAPI | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.turnstile;
}

function CloudflareTurnstileInner({
  siteKey,
  onVerify,
  onError,
  resetSignal = 0,
}: KeyedCaptchaProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const errorTriggeredRef = useRef(false);
  const lastResetSignalRef = useRef(resetSignal);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!siteKey) {
      if (!errorTriggeredRef.current) {
        errorTriggeredRef.current = true;
        onError();
      }
      return;
    }

    const abortController = new AbortController();

    (async () => {
      try {
        await loadScript({
          id: TURNSTILE_SCRIPT_ID,
          src: TURNSTILE_SCRIPT_URL,
          timeoutMs: SCRIPT_LOAD_TIMEOUT_MS,
          signal: abortController.signal,
        });

        const api = await pollForGlobal<TurnstileAPI>(
          () => getTurnstile(),
          { signal: abortController.signal },
        );

        if (!mountedRef.current || !containerRef.current) return;

        const id = api.render(containerRef.current, {
          sitekey: siteKey,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          callback: (token: string) => {
            if (mountedRef.current) onVerify(token);
          },
          'error-callback': () => {
            if (!errorTriggeredRef.current) {
              errorTriggeredRef.current = true;
              onError();
            }
          },
          'expired-callback': () => {
            if (mountedRef.current) onVerify('');
          },
        });
        widgetIdRef.current = id;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        logger.warn('Turnstile load/render failed', err);
        if (!errorTriggeredRef.current) {
          errorTriggeredRef.current = true;
          onError();
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      abortController.abort();
      const api = getTurnstile();
      if (api?.remove && widgetIdRef.current) {
        try { api.remove(widgetIdRef.current); } catch { /* safe */ }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, onVerify, onError]);

  useEffect(() => {
    if (lastResetSignalRef.current === resetSignal) return;
    lastResetSignalRef.current = resetSignal;
    const api = getTurnstile();
    if (api?.reset && widgetIdRef.current) {
      try { api.reset(widgetIdRef.current); } catch { /* safe */ }
    }
    onVerify('');
  }, [resetSignal, onVerify]);

  return (
    <div
      className="my-2 flex justify-center"
      role="group"
      aria-label="Cloudflare Turnstile security verification"
    >
      <div ref={containerRef} />
    </div>
  );
}

const CloudflareTurnstile = memo(CloudflareTurnstileInner);
CloudflareTurnstile.displayName = 'CloudflareTurnstile';

export default CloudflareTurnstile;
