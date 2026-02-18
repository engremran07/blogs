/**
 * ============================================================================
 * MODULE:   captcha/CaptchaOrchestrator.tsx
 * PURPOSE:  CAPTCHA Orchestrator — builds a fallback chain and renders the
 *           active provider. Designed as the public API for consumers.
 *
 * FALLBACK PRIORITY (enterprise default):
 *   Turnstile (latest, privacy-first)
 *     → reCAPTCHA v3 (invisible / score-based)
 *       → reCAPTCHA v2 (checkbox)
 *         → hCaptcha
 *           → In-house (zero external dependency, always available)
 *
 * ADMIN CONTROLS RESPECTED:
 *   - captchaEnabled === false → auto-verifies with sentinel token
 *   - Per-provider enableX toggles → skip disabled providers
 *   - fallbackOrder → admin-defined fallback chain overrides default
 *   - In-house settings (codeLength, endpoint) → forwarded to InhouseCaptcha
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore, memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CaptchaProviderType, CaptchaProps as CaptchaPropsType, CaptchaSettings } from '../types';
import { FALLBACK_PRIORITY, CAPTCHA_PROVIDER_TYPES } from '../types';
import {
  RecaptchaV2,
  RecaptchaV3,
  CloudflareTurnstile,
  HCaptcha,
  InhouseCaptcha,
} from './providers';
import { logger, CaptchaErrorBoundary } from '../utils';
import { CAPTCHA_DISABLED_TOKEN } from '../utils/constants';

/* Re-export types for backward compat */
export type CaptchaType = CaptchaProviderType;
export type CaptchaProps = CaptchaPropsType;

/* ── Legacy value normalisation ── */
const KNOWN_TYPES = new Set<string>(CAPTCHA_PROVIDER_TYPES);

function normaliseType(raw: string | undefined): CaptchaProviderType | undefined {
  if (!raw) return undefined;
  if (KNOWN_TYPES.has(raw)) return raw as CaptchaProviderType;
  return undefined;
}

/* ── Per-provider enable/disable map from admin settings ── */
function isProviderEnabled(
  provider: CaptchaProviderType,
  settings: CaptchaSettings,
): boolean {
  switch (provider) {
    case 'turnstile':
      return settings.enableTurnstile !== false;
    case 'recaptcha-v3':
      return settings.enableRecaptchaV3 !== false;
    case 'recaptcha-v2':
      return settings.enableRecaptchaV2 !== false;
    case 'hcaptcha':
      return settings.enableHcaptcha !== false;
    case 'custom':
      return settings.enableInhouse !== false;
    default:
      return true;
  }
}

/* ======================================================================== */
/*  ORCHESTRATOR COMPONENT                                                  */
/* ======================================================================== */

/* Stable helpers for useSyncExternalStore hydration detection */
const emptySubscribe = () => () => {};
const getClientHydrated = () => true;
const getServerHydrated = () => false;

function CaptchaInner({ onVerify, type, resetNonce = 0, settings: externalSettings, onDisabled }: CaptchaPropsType) {
  /*
   * Self-contained mode: if `settings` is passed directly, use it.
   * Otherwise self-fetch from /api/captcha/settings (public endpoint).
   */
  const [fetchedSettings, setFetchedSettings] = useState<CaptchaSettings | null>(null);
  const fetchStartedRef = useRef(false);

  // Self-fetch settings when none provided — triggered once on mount
  useEffect(() => {
    if (externalSettings) return;
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    fetch('/api/captcha/settings')
      .then((r) => r.json())
      .then((data) => setFetchedSettings(data as CaptchaSettings))
      .catch(() => setFetchedSettings({ captchaEnabled: false } as CaptchaSettings));
  }, [externalSettings]);

  const resolvedSettings: CaptchaSettings | undefined = externalSettings ?? fetchedSettings ?? undefined;
  const hasSettings = Boolean(resolvedSettings);

  const isHydrated = useSyncExternalStore(emptySubscribe, getClientHydrated, getServerHydrated);
  const [currentMethod, setCurrentMethod] = useState<CaptchaProviderType | null>(null);
  const [attemptedMethods, setAttemptedMethods] = useState<Set<CaptchaProviderType>>(new Set());

  const attemptedMethodsRef = useRef<Set<CaptchaProviderType>>(new Set());
  const exhaustedFallbackLoggedRef = useRef(false);
  const verifiedRef = useRef(false);
  const lastResetNonceRef = useRef(resetNonce);
  const killSwitchHandledRef = useRef(false);

  /* ── Derived settings ── */
  const configuredCaptchaType = resolvedSettings?.captchaType as string | undefined;
  const recaptchaV2SiteKey = resolvedSettings?.recaptchaV2SiteKey ?? resolvedSettings?.recaptchaSiteKey;
  const recaptchaV3SiteKey = resolvedSettings?.recaptchaV3SiteKey;
  const turnstileSiteKey = resolvedSettings?.turnstileSiteKey ?? undefined;
  const hcaptchaSiteKey = resolvedSettings?.hcaptchaSiteKey ?? undefined;

  /* ── Admin kill switch ── */
  const captchaEnabled = resolvedSettings?.captchaEnabled !== false;

  /* ── In-house overrides from admin ── */
  const inhouseCodeLength = (resolvedSettings?.inhouseCodeLength as number | undefined) ?? undefined;
  const inhouseEndpoint = (resolvedSettings?.inhouseChallengeEndpoint as string | undefined) ?? undefined;

  /* ── Admin fallback order ── */
  const adminFallbackOrder = (resolvedSettings?.fallbackOrder as CaptchaProviderType[] | undefined) ?? undefined;

  /* ── Kill switch: auto-verify when captcha is globally disabled ── */
  useEffect(() => {
    if (!isHydrated || !hasSettings) return;
    if (captchaEnabled) {
      killSwitchHandledRef.current = false;
      return;
    }
    if (killSwitchHandledRef.current) return;
    killSwitchHandledRef.current = true;

    logger.info('Captcha globally disabled via admin kill switch');
    if (onDisabled) {
      onDisabled();
    } else {
      onVerify(CAPTCHA_DISABLED_TOKEN, undefined, 'disabled');
    }
  }, [isHydrated, hasSettings, captchaEnabled, onVerify, onDisabled]);

  /* ── Build fallback chain (computed during render via useMemo) ── */
  const fallbackChain = useMemo((): CaptchaProviderType[] => {
    if (!hasSettings || !isHydrated || !captchaEnabled) return [];

    const hasV3 = Boolean(recaptchaV3SiteKey);
    const hasV2 = Boolean(recaptchaV2SiteKey);
    const hasTurnstile = Boolean(turnstileSiteKey);
    const hasHCaptcha = Boolean(hcaptchaSiteKey);

    const normalised = normaliseType(type) ?? normaliseType(configuredCaptchaType);

    const available: Record<CaptchaProviderType, boolean> = {
      turnstile: hasTurnstile && isProviderEnabled('turnstile', resolvedSettings!),
      'recaptcha-v3': hasV3 && isProviderEnabled('recaptcha-v3', resolvedSettings!),
      'recaptcha-v2': hasV2 && isProviderEnabled('recaptcha-v2', resolvedSettings!),
      hcaptcha: hasHCaptcha && isProviderEnabled('hcaptcha', resolvedSettings!),
      custom: isProviderEnabled('custom', resolvedSettings!),
    };

    const chain: CaptchaProviderType[] = [];
    const push = (m: CaptchaProviderType) => {
      if (!chain.includes(m) && available[m]) chain.push(m);
    };

    if (normalised && available[normalised]) push(normalised);

    const priority = adminFallbackOrder ?? FALLBACK_PRIORITY;
    for (const p of priority) push(p);

    if (adminFallbackOrder) {
      for (const p of FALLBACK_PRIORITY) push(p);
    }

    if (chain.length === 0) chain.push('custom');

    return chain;
  }, [hasSettings, type, configuredCaptchaType, recaptchaV2SiteKey, recaptchaV3SiteKey, turnstileSiteKey, hcaptchaSiteKey, isHydrated, captchaEnabled, resolvedSettings, adminFallbackOrder]);

  const isReady = fallbackChain.length > 0;

  /* Reset tracking state when the computed fallback chain changes */
  useEffect(() => {
    if (fallbackChain.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when fallback chain changes
      setCurrentMethod(fallbackChain[0]!);
      attemptedMethodsRef.current = new Set();
      setAttemptedMethods(new Set());
      exhaustedFallbackLoggedRef.current = false;
      verifiedRef.current = false;
    }
  }, [fallbackChain]);

  /* ── Reset handling ── */
  useEffect(() => {
    if (lastResetNonceRef.current === resetNonce) return;
    lastResetNonceRef.current = resetNonce;
    verifiedRef.current = false;
    exhaustedFallbackLoggedRef.current = false;
    killSwitchHandledRef.current = false;
  }, [resetNonce]);

  /* ── Fallback handler ── */
  const handleFallback = useCallback(() => {
    if (verifiedRef.current) return;
    if (!currentMethod || currentMethod === 'custom') return;

    const attempted = new Set(attemptedMethodsRef.current);
    if (attempted.has(currentMethod)) return;
    attempted.add(currentMethod);
    attemptedMethodsRef.current = attempted;
    setAttemptedMethods(new Set(attempted));

    logger.warn('Captcha fallback triggered', { currentMethod });

    const next = fallbackChain.find((m) => !attempted.has(m));
    if (next) {
      logger.info('Switching captcha method', { nextMethod: next });
      setCurrentMethod(next);
      return;
    }

    if (!exhaustedFallbackLoggedRef.current) {
      const attemptedArr: CaptchaProviderType[] = [];
      attempted.forEach((m) => attemptedArr.push(m));
      logger.info('All external providers exhausted → in-house captcha', { attempted: attemptedArr });
      exhaustedFallbackLoggedRef.current = true;
    }
    setCurrentMethod('custom');
  }, [currentMethod, fallbackChain]);

  /* ── Verify callbacks ── */
  const mkVerify = useCallback((captchaType: string) => (token: string) => {
    verifiedRef.current = Boolean(token);
    onVerify(token, undefined, captchaType);
  }, [onVerify]);

  const handleVerifyCustom = useCallback((token: string, captchaId: string) => {
    verifiedRef.current = Boolean(token);
    onVerify(token, captchaId, 'custom');
  }, [onVerify]);

  /* ── Kill switch: render nothing ── */
  if (!captchaEnabled && isHydrated && hasSettings) {
    return null;
  }

  /* ── Loading skeleton (hydrating or still fetching settings) ── */
  if (!isHydrated || !hasSettings) {
    return (
      <div
        className="h-12 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700"
        aria-label="Loading security verification"
      />
    );
  }

  /* Settings loaded but captcha disabled → render nothing */
  if (hasSettings && !captchaEnabled) {
    return null;
  }

  /* If settings loaded but chain couldn't build, render in-house directly */
  if (!resolvedSettings || !currentMethod || fallbackChain.length === 0 || !isReady) {
    return (
      <div className="min-h-12.5" role="region" aria-label="Security verification">
        <CaptchaErrorBoundary onError={() => {}} providerName="InhouseCaptcha-fallback">
          <InhouseCaptcha
            onVerify={handleVerifyCustom}
            resetSignal={resetNonce}
          />
        </CaptchaErrorBoundary>
      </div>
    );
  }

  const isInFallbackMode = attemptedMethods.size > 0 && currentMethod === 'custom';

  return (
    <div className="min-h-12.5 transition-all duration-200" role="region" aria-label="Security verification">
      {isInFallbackMode && (
        <div className="mb-1 flex items-center gap-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300" role="status">
          <AlertTriangle size={12} className="shrink-0" />
          External security check unavailable. Switched to internal verification.
        </div>
      )}

      {currentMethod === 'turnstile' && (
        <CaptchaErrorBoundary onError={handleFallback} providerName="CloudflareTurnstile">
          <CloudflareTurnstile siteKey={turnstileSiteKey ?? ''} onVerify={mkVerify('turnstile')} onError={handleFallback} resetSignal={resetNonce} />
        </CaptchaErrorBoundary>
      )}

      {currentMethod === 'recaptcha-v3' && (
        <CaptchaErrorBoundary onError={handleFallback} providerName="RecaptchaV3">
          <RecaptchaV3 siteKey={recaptchaV3SiteKey ?? undefined} onVerify={mkVerify('recaptcha-v3')} onError={handleFallback} resetSignal={resetNonce} />
        </CaptchaErrorBoundary>
      )}

      {currentMethod === 'recaptcha-v2' && (
        <CaptchaErrorBoundary onError={handleFallback} providerName="RecaptchaV2">
          <RecaptchaV2 siteKey={recaptchaV2SiteKey as string | undefined} onVerify={mkVerify('recaptcha-v2')} onError={handleFallback} resetSignal={resetNonce} />
        </CaptchaErrorBoundary>
      )}

      {currentMethod === 'hcaptcha' && (
        <CaptchaErrorBoundary onError={handleFallback} providerName="HCaptcha">
          <HCaptcha siteKey={hcaptchaSiteKey ?? ''} onVerify={mkVerify('hcaptcha')} onError={handleFallback} resetSignal={resetNonce} />
        </CaptchaErrorBoundary>
      )}

      {currentMethod === 'custom' && (
        <CaptchaErrorBoundary onError={() => {}} providerName="InhouseCaptcha">
          <InhouseCaptcha
            onVerify={handleVerifyCustom}
            resetSignal={resetNonce}
            challengeEndpoint={inhouseEndpoint}
            codeLength={inhouseCodeLength}
          />
        </CaptchaErrorBoundary>
      )}
    </div>
  );
}

export const Captcha = memo(CaptchaInner);
Captcha.displayName = 'Captcha';

export default Captcha;
