/**
 * ============================================================================
 * MODULE:   captcha/types.ts
 * PURPOSE:  Shared TypeScript interfaces for the pluggable CAPTCHA module
 * BOUNDARY: This file has ZERO framework imports — pure type definitions.
 *           Safe to copy to any repo.
 * ============================================================================
 */

// ─── Provider Types ─────────────────────────────────────────────────────────

/** Supported CAPTCHA provider identifiers. */
export type CaptchaProviderType =
  | "turnstile"
  | "recaptcha-v3"
  | "recaptcha-v2"
  | "hcaptcha"
  | "custom";

/**
 * Runtime array of all provider type values.
 * Used by the orchestrator for normalisation instead of importing @/lib/constants.
 */
export const CAPTCHA_PROVIDER_TYPES: readonly CaptchaProviderType[] = [
  "turnstile",
  "recaptcha-v3",
  "recaptcha-v2",
  "hcaptcha",
  "custom",
] as const;

// ─── Enums ──────────────────────────────────────────────────────────────────

/** When captcha is required */
export type CaptchaMode = "always" | "suspicious" | "disabled";

/** Visual theme for widgets that support theming */
export type CaptchaTheme = "light" | "dark" | "auto";

/** Widget size for providers that support it */
export type CaptchaSize = "normal" | "compact";

// ─── Component Settings ─────────────────────────────────────────────────────

/**
 * Settings shape consumed by the Captcha orchestrator.
 * When passed as a prop, makes the component fully self-contained
 * (no dependency on host-app SettingsContext).
 */
export interface CaptchaSettings {
  captchaType?: string;
  recaptchaSiteKey?: string;
  recaptchaV2SiteKey?: string;
  recaptchaV3SiteKey?: string;
  turnstileSiteKey?: string;
  hcaptchaSiteKey?: string;

  // ── Admin-dynamic overrides (pushed from DB settings) ──────────────────

  /** Global kill switch — if false, captcha is completely disabled */
  captchaEnabled?: boolean;
  /** Per-provider enable/disable */
  enableTurnstile?: boolean;
  enableRecaptchaV3?: boolean;
  enableRecaptchaV2?: boolean;
  enableHcaptcha?: boolean;
  enableInhouse?: boolean;
  /** Ordered fallback chain from admin */
  fallbackOrder?: CaptchaProviderType[];
  /** In-house captcha challenge settings */
  inhouseCodeLength?: number;
  inhouseChallengeTtlMs?: number;
  inhouseMaxRetries?: number;
  inhouseChallengeEndpoint?: string;
  /** Script loading timeout */
  scriptLoadTimeoutMs?: number;
  /** Theme / appearance */
  theme?: CaptchaTheme;
  size?: CaptchaSize;

  /** Allow arbitrary extra keys from a host-app settings bag */
  [key: string]: unknown;
}

// ─── Component Props ────────────────────────────────────────────────────────

/** Public props accepted by the `<Captcha>` orchestrator component. */
export interface CaptchaProps {
  /** Called when a CAPTCHA provider yields (or clears) a token. */
  onVerify: (token: string, captchaId?: string, type?: string) => void;
  /** Force a specific provider (bypasses admin-configured type). */
  type?: CaptchaProviderType;
  /** Increment to reset the current challenge (e.g. after form submission). */
  resetNonce?: number;
  /**
   * Provide settings directly to make the component fully self-contained.
   * When omitted, the component will try to read from SettingsContext.
   */
  settings?: CaptchaSettings;
  /**
   * Called when captcha is disabled via admin kill switch.
   * If not provided, captcha silently auto-verifies with token='__captcha_disabled__'.
   */
  onDisabled?: () => void;
}

/** Props common to every individual provider component. */
export interface CaptchaProviderProps {
  onVerify: (token: string) => void;
  onError: () => void;
  resetSignal?: number;
}

/** Extended props for providers that need a site key. */
export interface KeyedCaptchaProviderProps extends CaptchaProviderProps {
  siteKey: string;
}

/** Props for the in-house (custom) captcha provider. */
export interface InhouseCaptchaProviderProps {
  onVerify: (token: string, captchaId: string) => void;
  resetSignal?: number;
  /** API endpoint that generates challenge images. Defaults to `/api/captcha/challenge`. */
  challengeEndpoint?: string;
  /** Expected code length. Defaults to 6. */
  codeLength?: number;
}

/** Shape returned by GET /api/captcha/challenge */
export interface CaptchaChallengeResponse {
  image: string;
  captchaId: string;
  /** Audio data URI for accessible audio challenges (optional). */
  audio?: string;
}

// ─── Fallback Priority ──────────────────────────────────────────────────────

/**
 * Enterprise fallback priority.
 *
 * Default chain (when no keys override): Turnstile → v3 → v2 → in-house.
 * Providers without a configured site key are silently skipped during chain
 * construction; the in-house captcha is always appended as the final fallback
 * because it requires no external dependency.
 */
export const FALLBACK_PRIORITY: readonly CaptchaProviderType[] = [
  "turnstile",
  "recaptcha-v3",
  "recaptcha-v2",
  "hcaptcha",
  "custom",
] as const;

// ─── Module Config (constructor) ────────────────────────────────────────────

/**
 * Configuration object used by backend services (admin-settings, verification).
 * All fields are optional — missing values fall back to DEFAULT_CAPTCHA_CONFIG.
 */
export interface CaptchaConfig {
  // ── Global ────────────────────────────────────────────────────────────────

  /** Global kill switch — disable all captcha system-wide (default: true) */
  captchaEnabled?: boolean;
  /** When captcha is used: always, only for suspicious requests, or disabled (default: 'always') */
  captchaMode?: CaptchaMode;
  /** Default provider for new challenges (default: 'turnstile') */
  defaultProvider?: CaptchaProviderType;
  /** Enable automatic fallback chain (default: true) */
  enableFallbackChain?: boolean;
  /** Custom fallback order, overrides FALLBACK_PRIORITY (default: null — use built-in) */
  fallbackOrder?: CaptchaProviderType[];

  // ── Per-provider enable/disable ───────────────────────────────────────────

  /** Enable Cloudflare Turnstile (default: true) */
  enableTurnstile?: boolean;
  /** Enable Google reCAPTCHA v3 (default: true) */
  enableRecaptchaV3?: boolean;
  /** Enable Google reCAPTCHA v2 (default: true) */
  enableRecaptchaV2?: boolean;
  /** Enable hCaptcha (default: true) */
  enableHcaptcha?: boolean;
  /** Enable in-house custom captcha (default: true) */
  enableInhouse?: boolean;

  // ── Provider site keys (public — safe for DB storage) ─────────────────────

  /** Turnstile site key (overrides NEXT_PUBLIC_TURNSTILE_SITE_KEY) */
  turnstileSiteKey?: string | null;
  /** reCAPTCHA v2 site key (overrides NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY) */
  recaptchaV2SiteKey?: string | null;
  /** reCAPTCHA v3 site key (overrides NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY) */
  recaptchaV3SiteKey?: string | null;
  /** hCaptcha site key (overrides NEXT_PUBLIC_HCAPTCHA_SITE_KEY) */
  hcaptchaSiteKey?: string | null;

  // ── In-house captcha settings ─────────────────────────────────────────────

  /** Code length for in-house challenges (default: 6) */
  inhouseCodeLength?: number;
  /** TTL for in-house challenges in milliseconds (default: 300000 = 5 min) */
  inhouseChallengeTtlMs?: number;
  /** Max retries before locking out (default: 3) */
  inhouseMaxRetries?: number;
  /** API endpoint for challenge generation (default: '/api/captcha/challenge') */
  inhouseChallengeEndpoint?: string;

  // ── Script loading ────────────────────────────────────────────────────────

  /** Timeout for loading external provider scripts in ms (default: 10000) */
  scriptLoadTimeoutMs?: number;

  // ── Per-service captcha requirements ──────────────────────────────────────

  /** Require captcha for login (default: true) */
  requireCaptchaForLogin?: boolean;
  /** Require captcha for user registration (default: true) */
  requireCaptchaForRegistration?: boolean;
  /** Require captcha for comment posting (default: true) */
  requireCaptchaForComments?: boolean;
  /** Require captcha for contact form (default: true) */
  requireCaptchaForContact?: boolean;
  /** Require captcha for password reset (default: true) */
  requireCaptchaForPasswordReset?: boolean;
  /** Require captcha for newsletter subscription (default: false) */
  requireCaptchaForNewsletter?: boolean;

  // ── Difficulty / rate limiting ────────────────────────────────────────────

  /** reCAPTCHA v3 score threshold (0.0–1.0, default: 0.5) */
  recaptchaV3ScoreThreshold?: number;
  /** Max failed captcha attempts before lockout, 0 = unlimited (default: 5) */
  maxFailedAttempts?: number;
  /** Lockout duration after max failed attempts in minutes (default: 15) */
  lockoutDurationMinutes?: number;

  // ── Exemptions ────────────────────────────────────────────────────────────

  /** Bypass captcha for authenticated / logged-in users (default: false) */
  exemptAuthenticatedUsers?: boolean;
  /** Always bypass captcha for admin users (default: true) */
  exemptAdmins?: boolean;
  /** IP addresses / CIDR ranges exempted from captcha (default: []) */
  exemptedIps?: string[];

  // ── Theme / appearance ────────────────────────────────────────────────────

  /** Visual theme for widgets (default: 'auto') */
  theme?: CaptchaTheme;
  /** Widget size (default: 'normal') */
  size?: CaptchaSize;
}

// ─── DB-backed Admin Settings (singleton row) ───────────────────────────────

/**
 * All fields stored in the CaptchaSettings Prisma model.
 * Non-optional — defaults are applied when the row is created.
 */
export interface CaptchaSystemSettings {
  id: string;

  // Global
  captchaEnabled: boolean;
  captchaMode: CaptchaMode;
  defaultProvider: string;
  enableFallbackChain: boolean;
  fallbackOrder: string[];

  // Per-provider
  enableTurnstile: boolean;
  enableRecaptchaV3: boolean;
  enableRecaptchaV2: boolean;
  enableHcaptcha: boolean;
  enableInhouse: boolean;

  // Site keys (public, DB-stored override for env vars)
  turnstileSiteKey: string | null;
  recaptchaV2SiteKey: string | null;
  recaptchaV3SiteKey: string | null;
  hcaptchaSiteKey: string | null;

  // In-house settings
  inhouseCodeLength: number;
  inhouseChallengeTtlMs: number;
  inhouseMaxRetries: number;
  inhouseChallengeEndpoint: string;

  // Script loading
  scriptLoadTimeoutMs: number;

  // Per-service requirements
  requireCaptchaForLogin: boolean;
  requireCaptchaForRegistration: boolean;
  requireCaptchaForComments: boolean;
  requireCaptchaForContact: boolean;
  requireCaptchaForPasswordReset: boolean;
  requireCaptchaForNewsletter: boolean;

  // Difficulty
  recaptchaV3ScoreThreshold: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;

  // Exemptions
  exemptAuthenticatedUsers: boolean;
  exemptAdmins: boolean;
  exemptedIps: string[];

  // Theme
  theme: string;
  size: string;

  // Audit
  updatedBy: string | null;
  updatedAt: Date;
}

// ─── Config Consumer (for dynamic propagation) ─────────────────────────────

/**
 * Implement this interface in any service that should receive config updates
 * when admin changes captcha settings at runtime.
 */
export interface CaptchaConfigConsumer {
  updateConfig(cfg: Required<CaptchaConfig>): void;
}

// ─── Admin Overview Stats ───────────────────────────────────────────────────

export interface CaptchaStats {
  /** Total verification attempts (last 24h) */
  totalAttempts24h: number;
  /** Successful verifications (last 24h) */
  successfulVerifications24h: number;
  /** Failed verifications (last 24h) */
  failedVerifications24h: number;
  /** Success rate (0–100) */
  successRate: number;
  /** Currently locked out IPs */
  lockedOutCount: number;
  /** Breakdown by provider */
  providerBreakdown: Record<
    string,
    { attempts: number; successes: number; failures: number }
  >;
}

// ─── API Response Envelope ──────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Minimal Prisma Interface (DI boundary) ─────────────────────────────────

import type {
  PrismaDelegate,
  PrismaDelegateWithGroupBy,
} from "@/shared/prisma-delegate.types";
export type { PrismaDelegate };

export interface CaptchaPrismaClient {
  captchaSettings: PrismaDelegate<CaptchaSystemSettings>;
  captchaAttempt: PrismaDelegateWithGroupBy;
  captchaChallenge?: PrismaDelegate;
}
