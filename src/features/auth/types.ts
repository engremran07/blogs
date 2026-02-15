/**
 * ============================================================================
 * MODULE:   components/users/types.ts
 * PURPOSE:  Pure TypeScript types for the Users/Auth module.
 *           No framework imports — works in Next.js, NestJS, or standalone.
 * ============================================================================
 */

// ─── Roles ──────────────────────────────────────────────────────────────────

export const USER_ROLES = [
  'SUBSCRIBER',
  'CONTRIBUTOR',
  'AUTHOR',
  'EDITOR',
  'ADMINISTRATOR',
  'SUPER_ADMIN',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// ─── Display Name ───────────────────────────────────────────────────────────

export const DISPLAY_NAME_OPTIONS = [
  'username',
  'firstName',
  'lastName',
  'nickname',
  'email',
] as const;

export type DisplayNamePreference = (typeof DISPLAY_NAME_OPTIONS)[number];

// ─── Cookie SameSite ────────────────────────────────────────────────────────

export const SAME_SITE_OPTIONS = ['lax', 'strict', 'none'] as const;
export type SameSiteOption = (typeof SAME_SITE_OPTIONS)[number];

// ─── User Model (safe — no password/tokens) ────────────────────────────────

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  displayName: string | null;
  isEmailVerified: boolean;
  emailVerifiedAt: Date | null;
  language: string | null;

  // Contact
  website: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  alternateEmail: string | null;
  whatsapp: string | null;
  fax: string | null;

  // Social
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  tiktok: string | null;
  telegram: string | null;
  github: string | null;
  pinterest: string | null;
  snapchat: string | null;

  // Professional
  bio: string | null;
  company: string | null;
  jobTitle: string | null;

  // Location
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;

  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Auth Results ───────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

export interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
}

// ─── JWT ────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenType: 'refresh';
  sid: string;
  iat?: number;
  exp?: number;
}

/**
 * Framework-agnostic JWT signer interface.
 *
 * Consumers provide their own implementation:
 *   - Next.js Edge: `jose`
 *   - Node.js: `jsonwebtoken`
 *   - NestJS: `@nestjs/jwt` JwtService wrapper
 */
export interface JwtSigner {
  sign(
    payload: Record<string, unknown>,
    options: { expiresIn: string; secret?: string },
  ): string | Promise<string>;

  verify<T extends Record<string, unknown> = Record<string, unknown>>(
    token: string,
    options?: { secret?: string },
  ): T | Promise<T>;
}

// ─── Authenticated User (attached to request) ──────────────────────────────

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  capabilities?: string[];
}

// ─── Module Configuration (admin-dynamic) ───────────────────────────────────

/**
 * All admin-configurable settings for the Users module.
 * Flat structure — maps directly to DB columns in UserSettings model.
 */
export interface UserConfig {
  // ── Registration ──────────────────────────────────────────────────────
  /** Master switch for new user registration (default: true) */
  registrationEnabled: boolean;
  /** Master switch for login (default: true) */
  loginEnabled: boolean;
  /** Default role assigned to newly registered users (default: 'SUBSCRIBER') */
  defaultRole: UserRole;

  // ── CAPTCHA Integration ───────────────────────────────────────────────
  /** Require CAPTCHA on login (default: false) */
  requireCaptchaOnLogin: boolean;
  /** Require CAPTCHA on registration (default: false) */
  requireCaptchaOnRegister: boolean;
  /** Require CAPTCHA on password reset (default: false) */
  requireCaptchaOnPasswordReset: boolean;

  // ── Password Policy ───────────────────────────────────────────────────
  /** Minimum password length (default: 12) */
  passwordMinLength: number;
  /** Maximum password length (default: 128) */
  passwordMaxLength: number;
  /** Require at least one uppercase letter (default: true) */
  passwordRequireUppercase: boolean;
  /** Require at least one lowercase letter (default: true) */
  passwordRequireLowercase: boolean;
  /** Require at least one digit (default: true) */
  passwordRequireDigit: boolean;
  /** Require at least one special character (default: true) */
  passwordRequireSpecialChar: boolean;

  // ── Rate Limiting ─────────────────────────────────────────────────────
  /** Failed login attempts before lockout (default: 5) */
  maxLoginAttempts: number;
  /** Lockout duration in ms (default: 900000 = 15 min) */
  lockoutDurationMs: number;

  // ── Session / Token ───────────────────────────────────────────────────
  /** Access token lifetime in ms (default: 900000 = 15 min) */
  accessTokenExpiryMs: number;
  /** Refresh token lifetime in ms (default: 2592000000 = 30 days) */
  refreshTokenExpiryMs: number;
  /** Max concurrent sessions per user, 0 = unlimited (default: 10) */
  maxActiveSessions: number;

  // ── Email Verification ────────────────────────────────────────────────
  /** Require email verification before full access (default: true) */
  requireEmailVerification: boolean;
  /** Email verification token/code expiry in ms (default: 86400000 = 24h) */
  emailVerificationExpiryMs: number;
  /** Length of numeric verification code (default: 6) */
  emailVerificationCodeLength: number;

  // ── Password Reset ────────────────────────────────────────────────────
  /** Password reset token expiry in ms (default: 3600000 = 1h) */
  passwordResetExpiryMs: number;

  // ── Email Change ──────────────────────────────────────────────────────
  /** Email change request expiry in ms (default: 86400000 = 24h) */
  emailChangeExpiryMs: number;
  /** Require admin approval for email changes (default: true) */
  emailChangeRequiresAdminApproval: boolean;

  // ── Security ──────────────────────────────────────────────────────────
  /** bcrypt salt rounds (default: 12) */
  bcryptRounds: number;
  /** Enable CSRF token cookie (default: true) */
  csrfEnabled: boolean;
  /** Set Secure flag on cookies (default: true in production) */
  cookieSecure: boolean;
  /** SameSite attribute for cookies (default: 'lax') */
  cookieSameSite: SameSiteOption;
  /** Cookie domain — empty string = current domain (default: '') */
  cookieDomain: string;

  // ── Profile ───────────────────────────────────────────────────────────
  /** Show social link fields in profile (default: true) */
  enableSocialLinks: boolean;
  /** Show phone number field in profile (default: true) */
  enablePhoneNumber: boolean;
  /** Show extended contact/location fields in profile (default: true) */
  enableContactInfo: boolean;
  /** Show nickname field in profile (default: true) */
  enableNickname: boolean;
  /** Allow users to choose display name format (default: true) */
  enableDisplayNameChoice: boolean;
  /** Allow users to delete their own account (default: false) */
  allowSelfDeletion: boolean;
  /** Allow users to change their password (default: true) */
  allowPasswordChange: boolean;
  /** Allow users to change their username (default: false) */
  allowUsernameChange: boolean;
}

// ─── DB-backed Settings Row ─────────────────────────────────────────────────

/**
 * Shape of the UserSettings Prisma model (singleton row).
 * All fields required — defaults applied on creation.
 */
export interface UserSystemSettings extends UserConfig {
  id: string;
  updatedBy: string | null;
  updatedAt: Date;
}

// ─── Config Consumer ────────────────────────────────────────────────────────

/** Implement this to receive live config updates when admin changes settings. */
export interface UserConfigConsumer {
  updateConfig(cfg: UserConfig): void;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Error Classes (framework-agnostic) ─────────────────────────────────────

export class AuthError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = statusCode;
  }
}

// ─── Provider Interfaces (DI boundaries) ────────────────────────────────────

/**
 * Mail provider interface — consumers supply their own implementation.
 * (Resend, SendGrid, Nodemailer, etc.)
 */
export interface MailProvider {
  sendWelcomeEmail(email: string, firstName?: string | null): Promise<void>;
  sendEmailVerification(email: string, token: string, code: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendPasswordResetConfirmation(email: string): Promise<void>;
  sendEmailChangeVerification(email: string, code: string, type: 'OLD' | 'NEW'): Promise<void>;
}

/**
 * CAPTCHA provider interface — consumers supply their own implementation.
 * (reCAPTCHA, hCaptcha, Turnstile, etc.)
 */
export interface CaptchaProvider {
  verify(token: string, ip: string, captchaId?: string, captchaType?: string): Promise<boolean>;
}

// ─── Minimal Prisma Interface ───────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PrismaDelegate {
  findUnique(args: any): Promise<any>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<any>;
  delete(args: any): Promise<any>;
  deleteMany(args: any): Promise<any>;
  count(args?: any): Promise<number>;
}

export interface UsersPrismaClient {
  user: PrismaDelegate;
  userSession: PrismaDelegate;
  emailVerificationToken: PrismaDelegate;
  emailChangeRequest: PrismaDelegate;
  userSettings: PrismaDelegate;
  $transaction(operations: unknown[]): Promise<unknown[]>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
