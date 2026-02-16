/**
 * ============================================================================
 * MODULE:   features/auth/constants.ts
 * PURPOSE:  All hard defaults for the Users/Auth module.
 *           Every magic number / string that was scattered across services
 *           is centralised here and referenced by DEFAULT_USER_CONFIG.
 * ============================================================================
 */

import type { UserConfig, UserRole } from '../types';

// ─── Individual Constants (exported for direct use) ─────────────────────────

/** bcrypt salt rounds. */
export const BCRYPT_ROUNDS = 12;

/** Max failed logins before lockout. */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Lockout window in ms (15 minutes). */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Access token lifetime in ms (15 minutes). */
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

/** Refresh token lifetime in ms (30 days). */
export const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

/** Email verification token/code lifetime in ms (24 hours). */
export const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Password reset token lifetime in ms (1 hour). */
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

/** Email change request lifetime in ms (24 hours). */
export const EMAIL_CHANGE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Length of numeric email verification code. */
export const VERIFICATION_CODE_LENGTH = 6;

/** Max concurrent sessions per user. */
export const MAX_ACTIVE_SESSIONS = 10;

/** Minimum password length. */
export const PASSWORD_MIN_LENGTH = 12;

/** Maximum password length. */
export const PASSWORD_MAX_LENGTH = 128;

/** Default role for new registrations. */
export const DEFAULT_USER_ROLE: UserRole = 'SUBSCRIBER';

/**
 * Common/weak passwords blacklist.
 * Checked case-insensitively during password validation.
 */
export const WEAK_PASSWORDS = [
  'Password123!',
  '123456789abc',
  'Qwerty123!',
  'Admin123!',
  'Welcome123!',
  'Letmein123!',
  'Changeme123!',
  'Password1234!',
] as const;

/**
 * Special characters accepted in passwords.
 * Shared between regex builder and validation messages.
 */
export const PASSWORD_SPECIAL_CHARS = '@$!%*?&#^()_+=-[]{}|\\:;"\'<>,./`~';

/**
 * Fields excluded when returning a user object to the client.
 * Used by `sanitizeUser()` in auth.service.
 */
export const USER_SENSITIVE_FIELDS = [
  'password',
  'resetPasswordToken',
  'resetPasswordExpires',
] as const;

/**
 * Converts milliseconds to a human-friendly JWT `expiresIn` string.
 *   900000 → '15m', 86400000 → '24h', 2592000000 → '30d'
 */
export function msToExpiresIn(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms >= 86_400_000 && ms % 86_400_000 === 0) return `${ms / 86_400_000}d`;
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000}m`;
  return `${Math.max(1, Math.floor(ms / 1000))}s`;
}

// ─── Default Full Config ────────────────────────────────────────────────────

/**
 * Complete default configuration for the Users module.
 * Matches the values previously hardcoded across auth.service.ts,
 * user.service.ts, and auth.controller.ts — upgrading is a no-op.
 */
export const DEFAULT_USER_CONFIG: UserConfig = {
  // Registration
  registrationEnabled: true,
  loginEnabled: true,
  defaultRole: DEFAULT_USER_ROLE,

  // CAPTCHA
  requireCaptchaOnLogin: false,
  requireCaptchaOnRegister: false,
  requireCaptchaOnPasswordReset: false,

  // Password policy
  passwordMinLength: PASSWORD_MIN_LENGTH,
  passwordMaxLength: PASSWORD_MAX_LENGTH,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireDigit: true,
  passwordRequireSpecialChar: true,

  // Rate limiting
  maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
  lockoutDurationMs: LOCKOUT_DURATION_MS,

  // Session / Token
  accessTokenExpiryMs: ACCESS_TOKEN_EXPIRY_MS,
  refreshTokenExpiryMs: REFRESH_TOKEN_EXPIRY_MS,
  maxActiveSessions: MAX_ACTIVE_SESSIONS,

  // Email verification
  requireEmailVerification: true,
  emailVerificationExpiryMs: EMAIL_VERIFICATION_EXPIRY_MS,
  emailVerificationCodeLength: VERIFICATION_CODE_LENGTH,

  // Password reset
  passwordResetExpiryMs: PASSWORD_RESET_EXPIRY_MS,

  // Email change
  emailChangeExpiryMs: EMAIL_CHANGE_EXPIRY_MS,
  emailChangeRequiresAdminApproval: true,

  // Security
  bcryptRounds: BCRYPT_ROUNDS,
  csrfEnabled: true,
  cookieSecure: true,
  cookieSameSite: 'lax',
  cookieDomain: '',

  // Profile
  enableSocialLinks: true,
  enablePhoneNumber: true,
  enableContactInfo: true,
  enableNickname: true,
  enableDisplayNameChoice: true,
  allowSelfDeletion: false,
  allowPasswordChange: true,
  allowUsernameChange: false,
};
