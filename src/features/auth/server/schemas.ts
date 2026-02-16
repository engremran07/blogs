/**
 * ============================================================================
 * MODULE:   features/auth/schemas.ts
 * PURPOSE:  Zod validation schemas — replaces class-validator DTOs.
 *           Every user-facing input is validated here before reaching services.
 * ============================================================================
 */

import { z } from 'zod';
import { USER_ROLES, DISPLAY_NAME_OPTIONS, SAME_SITE_OPTIONS } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const trimmedString = z.string().trim();
const optionalTrimmedString = trimmedString.optional();
const email = trimmedString.email('Invalid email address').toLowerCase();

// ─── Auth Schemas ───────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
  captchaId: z.string().optional(),
  captchaType: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  name: trimmedString.min(1, 'Name is required'),
  username: optionalTrimmedString,
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
  captchaToken: z.string().optional(),
  captchaId: z.string().optional(),
  captchaType: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(1, 'Password is required'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type VerifyEmailTokenInput = z.infer<typeof verifyEmailTokenSchema>;

export const verifyEmailCodeSchema = z.object({
  email,
  code: z.string().regex(/^\d{4,8}$/, 'Invalid verification code'),
});
export type VerifyEmailCodeInput = z.infer<typeof verifyEmailCodeSchema>;

// ─── Profile Schemas ────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
  nickname: optionalTrimmedString,
  displayName: z.enum(DISPLAY_NAME_OPTIONS).optional(),
  language: optionalTrimmedString,

  // Contact
  website: z.string().url().optional().or(z.literal('')),
  phoneNumber: optionalTrimmedString,
  countryCode: optionalTrimmedString,
  alternateEmail: z.string().email().optional().or(z.literal('')),
  whatsapp: optionalTrimmedString,
  fax: optionalTrimmedString,

  // Social
  facebook: optionalTrimmedString,
  twitter: optionalTrimmedString,
  instagram: optionalTrimmedString,
  linkedin: optionalTrimmedString,
  youtube: optionalTrimmedString,
  tiktok: optionalTrimmedString,
  telegram: optionalTrimmedString,
  github: optionalTrimmedString,
  pinterest: optionalTrimmedString,
  snapchat: optionalTrimmedString,

  // Professional
  bio: z.string().max(1000).optional().or(z.literal('')),
  company: optionalTrimmedString,
  jobTitle: optionalTrimmedString,

  // Location
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalTrimmedString,
  zipCode: optionalTrimmedString,
  country: optionalTrimmedString,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateManagedUserSchema = updateProfileSchema.extend({
  password: z.string().optional(),
});
export type UpdateManagedUserInput = z.infer<typeof updateManagedUserSchema>;

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ─── Email Change Schemas ───────────────────────────────────────────────────

export const requestEmailChangeSchema = z.object({
  newEmail: email,
});
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;

export const verifyEmailChangeSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  oldEmailCode: trimmedString.min(1, 'Old email code is required'),
  newEmailCode: trimmedString.min(1, 'New email code is required'),
});
export type VerifyEmailChangeInput = z.infer<typeof verifyEmailChangeSchema>;

export const approveEmailChangeSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
});
export type ApproveEmailChangeInput = z.infer<typeof approveEmailChangeSchema>;

// ─── Bulk Operations ────────────────────────────────────────────────────────

export const bulkUserIdsSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user ID is required'),
});
export type BulkUserIdsInput = z.infer<typeof bulkUserIdsSchema>;

export const bulkUpdateRolesSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user ID is required'),
  role: z.enum(USER_ROLES),
});
export type BulkUpdateRolesInput = z.infer<typeof bulkUpdateRolesSchema>;

export const bulkVerifyEmailSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'At least one user ID is required'),
  verified: z.boolean(),
});
export type BulkVerifyEmailInput = z.infer<typeof bulkVerifyEmailSchema>;

// ─── Pagination Schema ─────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

// ─── Admin Settings Schema ──────────────────────────────────────────────────

export const updateUserSettingsSchema = z.object({
  // Registration
  registrationEnabled: z.boolean().optional(),
  loginEnabled: z.boolean().optional(),
  defaultRole: z.enum(USER_ROLES).optional(),

  // CAPTCHA
  requireCaptchaOnLogin: z.boolean().optional(),
  requireCaptchaOnRegister: z.boolean().optional(),
  requireCaptchaOnPasswordReset: z.boolean().optional(),

  // Password policy
  passwordMinLength: z.number().int().min(8).max(64).optional(),
  passwordMaxLength: z.number().int().min(32).max(256).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireLowercase: z.boolean().optional(),
  passwordRequireDigit: z.boolean().optional(),
  passwordRequireSpecialChar: z.boolean().optional(),

  // Rate limiting
  maxLoginAttempts: z.number().int().min(1).max(20).optional(),
  lockoutDurationMs: z.number().int().min(60_000).max(86_400_000).optional(),

  // Session / Token
  accessTokenExpiryMs: z.number().int().min(60_000).max(86_400_000).optional(),
  refreshTokenExpiryMs: z.number().int().min(3_600_000).max(365 * 86_400_000).optional(),
  maxActiveSessions: z.number().int().min(0).max(100).optional(),

  // Email verification
  requireEmailVerification: z.boolean().optional(),
  emailVerificationExpiryMs: z.number().int().min(600_000).max(7 * 86_400_000).optional(),
  emailVerificationCodeLength: z.number().int().min(4).max(8).optional(),

  // Password reset
  passwordResetExpiryMs: z.number().int().min(300_000).max(86_400_000).optional(),

  // Email change
  emailChangeExpiryMs: z.number().int().min(600_000).max(7 * 86_400_000).optional(),
  emailChangeRequiresAdminApproval: z.boolean().optional(),

  // Security
  bcryptRounds: z.number().int().min(10).max(15).optional(),
  csrfEnabled: z.boolean().optional(),
  cookieSecure: z.boolean().optional(),
  cookieSameSite: z.enum(SAME_SITE_OPTIONS).optional(),
  cookieDomain: z.string().optional(),

  // Profile
  enableSocialLinks: z.boolean().optional(),
  enablePhoneNumber: z.boolean().optional(),
  enableContactInfo: z.boolean().optional(),
  enableNickname: z.boolean().optional(),
  enableDisplayNameChoice: z.boolean().optional(),
  allowSelfDeletion: z.boolean().optional(),
  allowPasswordChange: z.boolean().optional(),
  allowUsernameChange: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.passwordMinLength !== undefined && data.passwordMaxLength !== undefined) {
      return data.passwordMinLength < data.passwordMaxLength;
    }
    return true;
  },
  { message: 'passwordMinLength must be less than passwordMaxLength', path: ['passwordMinLength'] },
);
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

// ─── Password Change Schema ────────────────────────────────────────────────

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Self-Service Schemas ───────────────────────────────────────────────────

export const changeUsernameSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
});
export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required for account deletion'),
  confirmText: z.literal('DELETE MY ACCOUNT', {
    message: 'You must type "DELETE MY ACCOUNT" to confirm',
  }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// ─── Admin: Create User & Password Reset ────────────────────────────────────

export const adminCreateUserSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  username: optionalTrimmedString,
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
  role: z.enum(USER_ROLES).optional(),
  isEmailVerified: z.boolean().optional(),
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newPassword: z.string().min(1, 'Password is required'),
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
