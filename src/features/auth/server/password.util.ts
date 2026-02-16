/**
 * ============================================================================
 * MODULE:   features/auth/password.util.ts
 * PURPOSE:  Password hashing and policy validation — extracted from services
 *           to eliminate duplication between auth.service and user.service.
 * ============================================================================
 */

import * as bcrypt from 'bcrypt';
import type { UserConfig } from '../types';
import { ValidationError } from '../types';
import { BCRYPT_ROUNDS, WEAK_PASSWORDS } from './constants';

// ─── Hashing ────────────────────────────────────────────────────────────────

/** Hash a password using bcrypt with configurable rounds. */
export async function hashPassword(
  password: string,
  rounds: number = BCRYPT_ROUNDS,
): Promise<string> {
  return bcrypt.hash(password, rounds);
}

/** Compare a plain-text password against a bcrypt hash. */
export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── Policy Validation ─────────────────────────────────────────────────────

/**
 * Build the validation regex from current admin config.
 * This is dynamic — if admin disables "require uppercase",
 * the regex no longer enforces that rule.
 */
function buildPasswordRegex(config: UserConfig): RegExp {
  const parts: string[] = [];

  if (config.passwordRequireLowercase) parts.push('(?=.*[a-z])');
  if (config.passwordRequireUppercase) parts.push('(?=.*[A-Z])');
  if (config.passwordRequireDigit) parts.push('(?=.*\\d)');
  if (config.passwordRequireSpecialChar) {
    parts.push('(?=.*[^A-Za-z0-9\\s])');
  }

  return new RegExp(`^${parts.join('')}.{${config.passwordMinLength},}$`);
}

/**
 * Validate password against the current admin-configured policy.
 * Throws `ValidationError` if the password fails any check.
 */
export function validatePasswordStrength(
  password: string,
  config: UserConfig,
): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }

  if (password.length > config.passwordMaxLength) {
    throw new ValidationError(
      `Password must not exceed ${config.passwordMaxLength} characters`,
    );
  }

  const regex = buildPasswordRegex(config);
  if (!regex.test(password)) {
    const requirements: string[] = [];
    requirements.push(`at least ${config.passwordMinLength} characters`);
    if (config.passwordRequireUppercase) requirements.push('1 uppercase letter');
    if (config.passwordRequireLowercase) requirements.push('1 lowercase letter');
    if (config.passwordRequireDigit) requirements.push('1 digit');
    if (config.passwordRequireSpecialChar) requirements.push('1 special character');

    throw new ValidationError(
      `Password must contain ${requirements.join(', ')}`,
    );
  }

  // Check against weak/common passwords
  const lowerPassword = password.toLowerCase();
  if (WEAK_PASSWORDS.some((weak) => lowerPassword.includes(weak.toLowerCase()))) {
    throw new ValidationError(
      'Password is too common. Please choose a stronger password',
    );
  }
}

/**
 * Returns a human-readable summary of the current password policy.
 * Useful for displaying requirements on registration/reset forms.
 */
export function getPasswordPolicySummary(config: UserConfig): string[] {
  const rules: string[] = [];
  rules.push(`Minimum ${config.passwordMinLength} characters`);
  rules.push(`Maximum ${config.passwordMaxLength} characters`);
  if (config.passwordRequireUppercase) rules.push('At least 1 uppercase letter');
  if (config.passwordRequireLowercase) rules.push('At least 1 lowercase letter');
  if (config.passwordRequireDigit) rules.push('At least 1 digit');
  if (config.passwordRequireSpecialChar) rules.push('At least 1 special character');
  rules.push('Must not contain common/weak passwords');
  return rules;
}
