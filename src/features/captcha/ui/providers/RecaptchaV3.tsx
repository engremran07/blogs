/**
 * ============================================================================
 * MODULE:   captcha/providers/RecaptchaV3.tsx
 * PURPOSE:  Google reCAPTCHA v3 (invisible / score-based) provider
 * BOUNDARY: Self-contained — loads its own script, executes silently.
 * ============================================================================
 */

'use client';

import { useEffect, useRef, memo } from 'react';
import type { CaptchaProviderProps } from '../../types';
import { loadScript, pollForGlobal, logger } from '../../utils';
import {
  RECAPTCHA_V3_SCRIPT_PREFIX,
  SCRIPT_LOAD_TIMEOUT_MS,
} from '../../utils/constants';

interface RecaptchaV3Props extends CaptchaProviderProps {
  siteKey?: string;
}

type GrecaptchaV3 = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: Record<string, unknown>) => Promise<string>;
};

function getGrecaptcha(): GrecaptchaV3 | undefined {
  if (typeof window === 'undefined') return undefined;
  const g = window.grecaptcha as GrecaptchaV3 | undefined;
  return (g && typeof g.ready === 'function' && typeof g.execute === 'function') ? g : undefined;
}

function RecaptchaV3Inner({
  onVerify,
  onError,
  siteKey,
  resetSignal = 0,
}: RecaptchaV3Props) {
  const errorTriggeredRef = useRef(false);
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

    if (lastResetSignalRef.current !== resetSignal) {
      lastResetSignalRef.current = resetSignal;
      onVerify('');
    }

    const abortController = new AbortController();

    (async () => {
      try {
        await loadScript({
          id: RECAPTCHA_V3_SCRIPT_PREFIX,
          src: `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
          timeoutMs: SCRIPT_LOAD_TIMEOUT_MS,
          signal: abortController.signal,
        });

        const api = await pollForGlobal<GrecaptchaV3>(
          () => getGrecaptcha(),
          { signal: abortController.signal },
        );

        if (!mountedRef.current) return;

        api.ready(() => {
          if (!mountedRef.current) return;
          api.execute(siteKey, { action: 'submit' })
            .then((token) => {
              if (mountedRef.current) {
                errorTriggeredRef.current = false;
                onVerify(token);
              }
            })
            .catch((err) => {
              logger.warn('reCAPTCHA v3 execution error', err);
              if (!errorTriggeredRef.current) {
                errorTriggeredRef.current = true;
                onError();
              }
            });
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        logger.warn('reCAPTCHA v3 load failed', err);
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
  }, [siteKey, onError, onVerify, resetSignal]);

  return <div className="hidden" aria-hidden="true" />;
}

const RecaptchaV3 = memo(RecaptchaV3Inner);
RecaptchaV3.displayName = 'RecaptchaV3';

export default RecaptchaV3;
