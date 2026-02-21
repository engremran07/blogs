/**
 * ============================================================================
 * MODULE:   captcha/providers/RecaptchaV2.tsx
 * PURPOSE:  Google reCAPTCHA v2 (checkbox) provider
 * BOUNDARY: Self-contained — loads its own script, renders its own widget.
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import type { CaptchaProviderProps } from '../../types';
import { loadScript, pollForGlobal, logger } from '../../utils';
import {
  RECAPTCHA_V2_SCRIPT_ID,
  RECAPTCHA_V2_SCRIPT_URL,
  RECAPTCHA_V2_LOAD_TIMEOUT_MS,
  MAX_RECAPTCHA_V2_RECOVERY,
} from '../../utils/constants';

interface RecaptchaV2Props extends CaptchaProviderProps {
  siteKey?: string;
}

type GrecaptchaV2 = {
  ready: (cb: () => void) => void;
  render: (el: HTMLElement, opts: Record<string, unknown>) => number;
  reset: (id: number) => void;
};

function getGrecaptcha(): GrecaptchaV2 | undefined {
  if (typeof window === 'undefined') return undefined;
  const g = window.grecaptcha as GrecaptchaV2 | undefined;
  return (g && typeof g.ready === 'function' && typeof g.render === 'function') ? g : undefined;
}

function RecaptchaV2Inner({
  onVerify,
  onError,
  siteKey,
  resetSignal = 0,
}: RecaptchaV2Props) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetState, setWidgetState] = useState<'ready' | 'expired' | 'timeout'>('ready');
  const containerRef = useRef<HTMLDivElement>(null);
  const errorTriggeredRef = useRef(false);
  const widgetIdRef = useRef<number | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const resetWidgetRef = useRef<((force?: boolean) => boolean) | null>(null);
  const lastResetSignalRef = useRef(resetSignal);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (siteKey) return;
    if (errorTriggeredRef.current) return;
    errorTriggeredRef.current = true;
    onError();
  }, [siteKey, onError]);

  useEffect(() => {
    if (typeof window === 'undefined' || !siteKey) return;
    mountedRef.current = true;

    const abortController = new AbortController();

    (async () => {
      try {
        await loadScript({
          id: RECAPTCHA_V2_SCRIPT_ID,
          src: RECAPTCHA_V2_SCRIPT_URL,
          timeoutMs: RECAPTCHA_V2_LOAD_TIMEOUT_MS,
          signal: abortController.signal,
        });

        await pollForGlobal<GrecaptchaV2>(
          () => getGrecaptcha(),
          { signal: abortController.signal },
        );

        if (mountedRef.current) {
          errorTriggeredRef.current = false;
          setIsLoaded(true);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        logger.warn('reCAPTCHA v2 script load failed', err);
        if (!errorTriggeredRef.current) {
          errorTriggeredRef.current = true;
          onError();
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      abortController.abort();
    };
  }, [siteKey, onError]);

  useEffect(() => {
    const api = getGrecaptcha();
    if (!(isLoaded && containerRef.current && api && siteKey)) return;

    try {
      const resetWidget = (force = false): boolean => {
        if (widgetIdRef.current === null) return false;
        if (!force && recoveryAttemptsRef.current >= MAX_RECAPTCHA_V2_RECOVERY) return false;
        try {
          if (!force) recoveryAttemptsRef.current += 1;
          api.reset(widgetIdRef.current);
          setWidgetState('ready');
          return true;
        } catch (e) {
          logger.warn('reCAPTCHA v2 widget reset failed', e);
          return false;
        }
      };
      resetWidgetRef.current = resetWidget;

      api.ready(() => {
        try {
          if (widgetIdRef.current !== null || !containerRef.current) return;
          const widgetId = api.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              recoveryAttemptsRef.current = 0;
              setWidgetState('ready');
              onVerify(token);
            },
            'error-callback': () => {
              const ok = resetWidget();
              if (!ok) onError();
            },
            'expired-callback': () => {
              setWidgetState('expired');
              onVerify('');
            },
            'timeout-callback': () => {
              setWidgetState('timeout');
              onVerify('');
            },
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          } as never);
          widgetIdRef.current = typeof widgetId === 'number' ? widgetId : null;
        } catch (e) {
          logger.warn('reCAPTCHA v2 render exception', e);
          onError();
        }
      });
    } catch (e) {
      logger.warn('reCAPTCHA v2 setup error', e);
      onError();
    }

    return () => {
      resetWidgetRef.current = null;
    };
  }, [isLoaded, onVerify, onError, siteKey]);

  useEffect(() => {
    if (lastResetSignalRef.current === resetSignal) return;
    lastResetSignalRef.current = resetSignal;
    onVerify('');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Responds to external resetSignal prop change; resetting widget requires state update
    setWidgetState('ready');
    resetWidgetRef.current?.(true);
  }, [resetSignal, onVerify]);

  const handleManualRetry = useCallback(() => {
    onVerify('');
    setWidgetState('ready');
    resetWidgetRef.current?.(true);
  }, [onVerify]);

  if (!siteKey) {
    return (
      <div
        className="h-12 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"
        aria-label="Loading security check"
      />
    );
  }

  return (
    <div
      className="my-2 flex flex-col gap-1"
      role="group"
      aria-label="reCAPTCHA v2 security verification"
    >
      <div className="flex justify-center">
        <div ref={containerRef} />
      </div>
      {(widgetState === 'expired' || widgetState === 'timeout') && (
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {widgetState === 'expired' ? 'Security check expired.' : 'Security check timed out.'}
          </span>
          <button
            type="button"
            onClick={handleManualRetry}
            aria-label={widgetState === 'expired' ? 'Retry expired security check' : 'Retry timed out security check'}
            className="text-xs text-primary underline hover:text-primary/80"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

const RecaptchaV2 = memo(RecaptchaV2Inner);
RecaptchaV2.displayName = 'RecaptchaV2';

export default RecaptchaV2;
