/**
 * ============================================================================
 * MODULE:   captcha/utils/index.ts
 * PURPOSE:  Barrel export for captcha utilities
 * ============================================================================
 */

export { default as logger, setLogger } from './logger';
export type { CaptchaLogger } from './logger';

export { loadScript, pollForGlobal, clearScriptCache } from './scriptLoader';
export type { ScriptLoadOptions } from './scriptLoader';

export { CaptchaErrorBoundary } from './ErrorBoundary';
export type { CaptchaErrorBoundaryProps } from './ErrorBoundary';

export {
  SCRIPT_LOAD_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  MAX_POLL_ATTEMPTS,
  DEFAULT_CHALLENGE_ENDPOINT,
  DEFAULT_CODE_LENGTH,
  CHALLENGE_TTL_MS,
  MAX_CHALLENGE_RETRIES,
  EXPIRY_TICK_MS,
  TURNSTILE_SCRIPT_ID,
  TURNSTILE_SCRIPT_URL,
  HCAPTCHA_SCRIPT_ID,
  HCAPTCHA_SCRIPT_URL,
  RECAPTCHA_V2_SCRIPT_ID,
  RECAPTCHA_V2_SCRIPT_URL,
  RECAPTCHA_V3_SCRIPT_PREFIX,
  RECAPTCHA_V2_LOAD_TIMEOUT_MS,
  MAX_RECAPTCHA_V2_RECOVERY,
} from './constants';
