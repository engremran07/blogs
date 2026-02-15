// captcha/schemas.ts
// Zod validation schemas for CAPTCHA admin settings
// Usage: schemas.updateCaptchaSettings.parse(body) in route handlers

import { z } from 'zod';

// ─── Enum Schemas ───────────────────────────────────────────────────────────

const captchaProviderTypeSchema = z.enum([
  'turnstile',
  'recaptcha-v3',
  'recaptcha-v2',
  'hcaptcha',
  'custom',
]);

const captchaModeSchema = z.enum(['always', 'suspicious', 'disabled']);
const captchaThemeSchema = z.enum(['light', 'dark', 'auto']);
const captchaSizeSchema = z.enum(['normal', 'compact']);

// ─── Admin Settings Update Schema ───────────────────────────────────────────

export const updateCaptchaSettingsSchema = z.object({
  // Global
  captchaEnabled: z.boolean().optional(),
  captchaMode: captchaModeSchema.optional(),
  defaultProvider: captchaProviderTypeSchema.optional(),
  enableFallbackChain: z.boolean().optional(),
  fallbackOrder: z.array(captchaProviderTypeSchema).min(1).max(5).optional(),

  // Per-provider enable/disable
  enableTurnstile: z.boolean().optional(),
  enableRecaptchaV3: z.boolean().optional(),
  enableRecaptchaV2: z.boolean().optional(),
  enableHcaptcha: z.boolean().optional(),
  enableInhouse: z.boolean().optional(),

  // Site keys (public — safe to store in DB)
  turnstileSiteKey: z.string().max(200).nullable().optional(),
  recaptchaV2SiteKey: z.string().max(200).nullable().optional(),
  recaptchaV3SiteKey: z.string().max(200).nullable().optional(),
  hcaptchaSiteKey: z.string().max(200).nullable().optional(),

  // In-house settings
  inhouseCodeLength: z.number().int().min(4).max(10).optional(),
  inhouseChallengeTtlMs: z.number().int().min(30_000).max(600_000).optional(), // 30s – 10min
  inhouseMaxRetries: z.number().int().min(1).max(20).optional(),
  inhouseChallengeEndpoint: z.string().max(200).startsWith('/').optional(),

  // Script loading
  scriptLoadTimeoutMs: z.number().int().min(3_000).max(60_000).optional(), // 3s – 60s

  // Per-service captcha requirements
  requireCaptchaForLogin: z.boolean().optional(),
  requireCaptchaForRegistration: z.boolean().optional(),
  requireCaptchaForComments: z.boolean().optional(),
  requireCaptchaForContact: z.boolean().optional(),
  requireCaptchaForPasswordReset: z.boolean().optional(),
  requireCaptchaForNewsletter: z.boolean().optional(),

  // Difficulty / rate limiting
  recaptchaV3ScoreThreshold: z.number().min(0).max(1).optional(),
  maxFailedAttempts: z.number().int().min(0).max(100).optional(),
  lockoutDurationMinutes: z.number().int().min(1).max(1440).optional(), // max 24h

  // Exemptions
  exemptAuthenticatedUsers: z.boolean().optional(),
  exemptAdmins: z.boolean().optional(),
  exemptedIps: z.array(z.string().max(45)).max(10000).optional(),

  // Theme
  theme: captchaThemeSchema.optional(),
  size: captchaSizeSchema.optional(),
}).strict();

export type UpdateCaptchaSettingsPayload = z.infer<typeof updateCaptchaSettingsSchema>;

// ─── Verify Captcha Schema (for API routes) ─────────────────────────────────

export const verifyCaptchaSchema = z.object({
  captchaToken: z.string().min(1, 'CAPTCHA token is required'),
  captchaType: captchaProviderTypeSchema.optional(),
  captchaId: z.string().optional(),
});

export type VerifyCaptchaPayload = z.infer<typeof verifyCaptchaSchema>;

// ─── Exempted IPs Management ────────────────────────────────────────────────

export const manageIpsSchema = z.object({
  ips: z.array(z.string().max(45)).min(1).max(1000),
});

export type ManageIpsPayload = z.infer<typeof manageIpsSchema>;

// ─── Service-Level Check Schema ─────────────────────────────────────────────

export const captchaRequirementCheckSchema = z.object({
  service: z.enum([
    'login',
    'registration',
    'comments',
    'contact',
    'passwordReset',
    'newsletter',
  ]),
  isAuthenticated: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  clientIp: z.string().optional(),
});

export type CaptchaRequirementCheckPayload = z.infer<typeof captchaRequirementCheckSchema>;
