/**
 * ============================================================================
 * MODULE:   captcha/index.ts
 * PURPOSE:  Public API barrel for the pluggable CAPTCHA module
 *
 * USAGE:
 *   import { Captcha } from '@/components/captcha';
 *   import type { CaptchaProps, CaptchaProviderType } from '@/components/captcha';
 *   import { CaptchaAdminSettingsService } from '@/components/captcha';
 *
 * This module is designed with clear boundaries so it can be extracted
 * to a standalone repository (@yourorg/captcha-react) in the future.
 * ============================================================================
 */

/* ── Main component (the component consumers use) ── */
export { default as Captcha, Captcha as CaptchaComponent } from './ui/CaptchaOrchestrator';
export type { CaptchaType } from './ui/CaptchaOrchestrator';

/* ── Individual providers (for advanced usage) ── */
export {
  RecaptchaV2,
  RecaptchaV3,
  CloudflareTurnstile,
  HCaptcha,
  InhouseCaptcha,
} from './ui/providers';

/* ── Types ── */
export type {
  CaptchaProps,
  CaptchaProviderType,
  CaptchaProviderProps,
  KeyedCaptchaProviderProps,
  InhouseCaptchaProviderProps,
  CaptchaChallengeResponse,
  CaptchaSettings,
  CaptchaConfig,
  CaptchaSystemSettings,
  CaptchaConfigConsumer,
  CaptchaStats,
  CaptchaMode,
  CaptchaTheme,
  CaptchaSize,
  CaptchaPrismaClient,
  PrismaDelegate,
  ApiSuccess,
  ApiError,
  ApiResponse,
} from './types';

export { FALLBACK_PRIORITY, CAPTCHA_PROVIDER_TYPES } from './types';

/* ── Admin settings service (backend) ── */
export { CaptchaAdminSettingsService } from './server/admin-settings.service';

/* ── Zod schemas ── */
export {
  updateCaptchaSettingsSchema,
  verifyCaptchaSchema,
  manageIpsSchema,
  captchaRequirementCheckSchema,
} from './server/schemas';
export type {
  UpdateCaptchaSettingsPayload,
  VerifyCaptchaPayload,
  ManageIpsPayload,
  CaptchaRequirementCheckPayload,
} from './server/schemas';

/* ── Constants ── */
export { DEFAULT_CAPTCHA_CONFIG } from './utils/constants';
export { CAPTCHA_DISABLED_TOKEN } from './utils/constants';

/* ── Utilities (for advanced consumers / testing) ── */
export { setLogger } from './utils/logger';
export type { CaptchaLogger } from './utils/logger';
export { CaptchaErrorBoundary } from './utils/ErrorBoundary';
export { loadScript, clearScriptCache } from './utils/scriptLoader';
