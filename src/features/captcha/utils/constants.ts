/**
 * ============================================================================
 * MODULE:   captcha/utils/constants.ts
 * PURPOSE:  All numeric / string constants for the CAPTCHA module,
 *           centralised in one place for easy tuning and auditing.
 * ============================================================================
 */

import type { CaptchaConfig } from '../types';

/* ── Script loading ── */
export const SCRIPT_LOAD_TIMEOUT_MS = 10_000;
export const POLL_INTERVAL_MS = 200;
export const MAX_POLL_ATTEMPTS = 50;

/* ── InhouseCaptcha ── */
export const DEFAULT_CHALLENGE_ENDPOINT = '/api/captcha/challenge';
export const DEFAULT_CODE_LENGTH = 6;
export const CHALLENGE_TTL_MS = 5 * 60 * 1_000; // 5 minutes
export const MAX_CHALLENGE_RETRIES = 3;
export const EXPIRY_TICK_MS = 1_000;

/* ── Provider script URLs ── */
export const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const HCAPTCHA_SCRIPT_ID = 'hcaptcha-script';
export const HCAPTCHA_SCRIPT_URL =
  'https://js.hcaptcha.com/1/api.js?render=explicit';

export const RECAPTCHA_V2_SCRIPT_ID = 'recaptcha-v2-script';
export const RECAPTCHA_V2_SCRIPT_URL =
  'https://www.google.com/recaptcha/api.js?render=explicit';

export const RECAPTCHA_V3_SCRIPT_PREFIX = 'recaptcha-v3-script';

/* ── RecaptchaV2 specific ── */
export const RECAPTCHA_V2_LOAD_TIMEOUT_MS = 8_000;
export const MAX_RECAPTCHA_V2_RECOVERY = 2;

/* ── Disabled token sentinel ── */
export const CAPTCHA_DISABLED_TOKEN = '__captcha_disabled__';

/* ── Default Admin Config (all fields) ── */

export const DEFAULT_CAPTCHA_CONFIG: Required<CaptchaConfig> = {
  // Global
  captchaEnabled: false,
  captchaMode: 'always',
  defaultProvider: 'turnstile',
  enableFallbackChain: true,
  fallbackOrder: ['turnstile', 'recaptcha-v3', 'recaptcha-v2', 'hcaptcha', 'custom'],

  // Per-provider
  enableTurnstile: true,
  enableRecaptchaV3: true,
  enableRecaptchaV2: true,
  enableHcaptcha: true,
  enableInhouse: true,

  // Site keys (null = use env vars)
  turnstileSiteKey: null,
  recaptchaV2SiteKey: null,
  recaptchaV3SiteKey: null,
  hcaptchaSiteKey: null,

  // In-house
  inhouseCodeLength: DEFAULT_CODE_LENGTH,
  inhouseChallengeTtlMs: CHALLENGE_TTL_MS,
  inhouseMaxRetries: MAX_CHALLENGE_RETRIES,
  inhouseChallengeEndpoint: DEFAULT_CHALLENGE_ENDPOINT,

  // Script loading
  scriptLoadTimeoutMs: SCRIPT_LOAD_TIMEOUT_MS,

  // Per-service requirements
  requireCaptchaForLogin: false,
  requireCaptchaForRegistration: false,
  requireCaptchaForComments: false,
  requireCaptchaForContact: false,
  requireCaptchaForPasswordReset: false,
  requireCaptchaForNewsletter: false,

  // Difficulty
  recaptchaV3ScoreThreshold: 0.5,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,

  // Exemptions
  exemptAuthenticatedUsers: false,
  exemptAdmins: true,
  exemptedIps: [],

  // Theme
  theme: 'auto',
  size: 'normal',
};
