/**
 * ============================================================================
 * MODULE:   features/auth/index.ts
 * PURPOSE:  Public barrel exports for the Users module.
 * ============================================================================
 */

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  UserRole,
  DisplayNamePreference,
  SameSiteOption,
  SafeUser,
  AuthTokens,
  AuthResult,
  SessionContext,
  AccessTokenPayload,
  RefreshTokenPayload,
  JwtSigner,
  AuthenticatedUser,
  UserConfig,
  UserSystemSettings,
  UserConfigConsumer,
  PaginationParams,
  PaginatedResult,
  MailProvider,
  CaptchaProvider,
  PrismaDelegate,
  UsersPrismaClient,
  ApiSuccess,
  ApiError,
  ApiResponse,
} from "./types";

export { USER_ROLES, DISPLAY_NAME_OPTIONS, SAME_SITE_OPTIONS } from "./types";
export { AuthError, ValidationError, NotFoundError } from "./types";

// ─── Constants ──────────────────────────────────────────────────────────────
export { DEFAULT_USER_CONFIG, msToExpiresIn } from "./server/constants";
export {
  BCRYPT_ROUNDS,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  ACCESS_TOKEN_EXPIRY_MS,
  REFRESH_TOKEN_EXPIRY_MS,
  EMAIL_VERIFICATION_EXPIRY_MS,
  PASSWORD_RESET_EXPIRY_MS,
  EMAIL_CHANGE_EXPIRY_MS,
  VERIFICATION_CODE_LENGTH,
  MAX_ACTIVE_SESSIONS,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  WEAK_PASSWORDS,
  PASSWORD_SPECIAL_CHARS,
  USER_SENSITIVE_FIELDS,
  DEFAULT_USER_ROLE,
} from "./server/constants";

// ─── Schemas (Zod) ──────────────────────────────────────────────────────────
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailTokenSchema,
  verifyEmailCodeSchema,
  updateProfileSchema,
  updateManagedUserSchema,
  updateUserRoleSchema,
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
  approveEmailChangeSchema,
  bulkUserIdsSchema,
  bulkUpdateRolesSchema,
  bulkVerifyEmailSchema,
  paginationSchema,
  updateUserSettingsSchema,
  changePasswordSchema,
  changeUsernameSchema,
  deleteAccountSchema,
  adminCreateUserSchema,
  adminResetPasswordSchema,
} from "./server/schemas";

export type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailTokenInput,
  VerifyEmailCodeInput,
  UpdateProfileInput,
  UpdateManagedUserInput,
  UpdateUserRoleInput,
  RequestEmailChangeInput,
  VerifyEmailChangeInput,
  ApproveEmailChangeInput,
  BulkUserIdsInput,
  BulkUpdateRolesInput,
  BulkVerifyEmailInput,
  PaginationInput,
  UpdateUserSettingsInput,
  ChangePasswordInput,
  ChangeUsernameInput,
  DeleteAccountInput,
  AdminCreateUserInput,
  AdminResetPasswordInput,
} from "./server/schemas";

// ─── Capabilities ───────────────────────────────────────────────────────────
export {
  ALL_CAPABILITIES,
  ROLE_CAPABILITIES,
  ADMIN_ROLES,
  MODERATOR_ROLES,
  hasCapability,
  getUserCapabilities,
  outranks,
  isAdminRole,
  isModeratorRole,
  getLoginRedirectPath,
} from "./server/capabilities";
export type { Capability } from "./server/capabilities";

// ─── Services ───────────────────────────────────────────────────────────────
export { AuthService } from "./server/auth.service";
export { UserService } from "./server/user.service";
export { UserAdminSettingsService } from "./server/admin-settings.service";

// ─── Utilities ──────────────────────────────────────────────────────────────
export {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  getPasswordPolicySummary,
} from "./server/password.util";

export {
  sanitizeText,
  sanitizeEmail,
  sanitizeURL,
  sanitizeSlug,
} from "./server/sanitization.util";

// ─── Middleware ──────────────────────────────────────────────────────────────
// The legacy auth middleware (getTokenFromRequest, withAuth, withRoles, etc.)
// has been removed — auth is now handled by NextAuth's `auth()` helper, and
// CSRF validation lives in src/proxy.ts (Next.js middleware).
