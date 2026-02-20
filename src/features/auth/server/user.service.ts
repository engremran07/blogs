/**
 * ============================================================================
 * MODULE:   features/auth/user.service.ts
 * PURPOSE:  User management — framework-agnostic.
 *           Profile updates, admin CRUD, bulk actions, email change workflow.
 *
 * MIGRATION NOTES (NestJS → framework-agnostic):
 *   - @Injectable() removed — plain class with constructor DI
 *   - NestJS exceptions → ValidationError / NotFoundError
 *   - Duplicated validatePasswordStrength → password.util.ts
 *   - getAllUsers → paginated with filtering
 *   - Email change uses admin config for expiryMs
 * ============================================================================
 */

import * as crypto from "crypto";
import type {
  UserConfig,
  UserConfigConsumer,
  UsersPrismaClient,
  MailProvider,
  SafeUser,
  PaginationParams,
  PaginatedResult,
  UserRole,
  UserRecord,
} from "../types";
import { ValidationError, NotFoundError } from "../types";
import { USER_ROLES } from "../types";
import { DEFAULT_USER_CONFIG } from "./constants";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "./password.util";
import { sanitizeSlug, sanitizeEmail } from "./sanitization.util";

// ─── Service ────────────────────────────────────────────────────────────────

export class UserService implements UserConfigConsumer {
  private config: UserConfig;

  constructor(
    private readonly prisma: UsersPrismaClient,
    private readonly mail: MailProvider,
    config?: Partial<UserConfig>,
  ) {
    this.config = { ...DEFAULT_USER_CONFIG, ...config };
  }

  /** Called by AdminSettingsService when admin changes config. */
  updateConfig(cfg: UserConfig): void {
    this.config = cfg;
  }

  // ─── Safe-field select clause ───────────────────────────────────────────

  /** Standard select clause — no password/reset fields. */
  private static readonly SAFE_SELECT = {
    id: true,
    username: true,
    email: true,
    firstName: true,
    lastName: true,
    nickname: true,
    displayName: true,
    isEmailVerified: true,
    emailVerifiedAt: true,
    language: true,

    // Contact
    website: true,
    phoneNumber: true,
    countryCode: true,
    alternateEmail: true,
    whatsapp: true,
    fax: true,

    // Social
    facebook: true,
    twitter: true,
    instagram: true,
    linkedin: true,
    youtube: true,
    tiktok: true,
    telegram: true,
    github: true,
    pinterest: true,
    snapchat: true,

    // Professional
    bio: true,
    company: true,
    jobTitle: true,

    // Location
    address: true,
    city: true,
    state: true,
    zipCode: true,
    country: true,

    role: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  // ─── Read Operations ──────────────────────────────────────────────────

  async getUserById(id: string): Promise<SafeUser & { postsCount: number }> {
    const user = (await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...UserService.SAFE_SELECT,
        _count: { select: { posts: true } },
      },
    })) as (UserRecord & { _count?: { posts: number } }) | null;

    if (!user) throw new NotFoundError("User not found");

    return {
      ...user,
      postsCount: user._count?.posts ?? 0,
    };
  }

  /**
   * List users with pagination, filtering, and search.
   */
  async getAllUsers(
    params: PaginationParams & {
      search?: string;
      role?: UserRole;
    },
  ): Promise<
    PaginatedResult<
      SafeUser & { postsCount: number; displayNameFormatted: string }
    >
  > {
    const { page, limit, sortBy, sortOrder, search, role } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...UserService.SAFE_SELECT,
          _count: { select: { posts: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((u: SafeUser & { _count?: { posts: number } }) => ({
        ...u,
        postsCount: u._count?.posts ?? 0,
        displayNameFormatted: this.getFormattedDisplayName(u),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // ─── Profile Updates ──────────────────────────────────────────────────

  async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      nickname?: string;
      displayName?: string;
      language?: string;
      website?: string;
      // Contact
      phoneNumber?: string;
      countryCode?: string;
      alternateEmail?: string;
      whatsapp?: string;
      fax?: string;
      // Social
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
      tiktok?: string;
      telegram?: string;
      github?: string;
      pinterest?: string;
      snapchat?: string;
      // Professional
      bio?: string;
      company?: string;
      jobTitle?: string;
      // Location
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    },
  ): Promise<SafeUser> {
    // Filter fields based on admin config
    const updateData: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      language: data.language,
      website: data.website,
    };

    if (this.config.enableNickname) updateData.nickname = data.nickname;
    if (this.config.enableDisplayNameChoice)
      updateData.displayName = data.displayName;
    if (this.config.enableSocialLinks) {
      updateData.facebook = data.facebook;
      updateData.twitter = data.twitter;
      updateData.instagram = data.instagram;
      updateData.linkedin = data.linkedin;
      updateData.youtube = data.youtube;
      updateData.tiktok = data.tiktok;
      updateData.telegram = data.telegram;
      updateData.github = data.github;
      updateData.pinterest = data.pinterest;
      updateData.snapchat = data.snapchat;
    }
    if (this.config.enablePhoneNumber) {
      updateData.phoneNumber = data.phoneNumber;
      updateData.countryCode = data.countryCode;
      updateData.whatsapp = data.whatsapp;
    }
    if (this.config.enableContactInfo) {
      updateData.alternateEmail = data.alternateEmail;
      updateData.fax = data.fax;
      updateData.bio = data.bio;
      updateData.company = data.company;
      updateData.jobTitle = data.jobTitle;
      updateData.address = data.address;
      updateData.city = data.city;
      updateData.state = data.state;
      updateData.zipCode = data.zipCode;
      updateData.country = data.country;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: UserService.SAFE_SELECT,
    });
  }

  // ─── Admin User Management ────────────────────────────────────────────

  async updateUserByAdmin(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      nickname?: string;
      displayName?: string;
      language?: string;
      website?: string;
      // Contact
      phoneNumber?: string;
      countryCode?: string;
      alternateEmail?: string;
      whatsapp?: string;
      fax?: string;
      // Social
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
      tiktok?: string;
      telegram?: string;
      github?: string;
      pinterest?: string;
      snapchat?: string;
      // Professional
      bio?: string;
      company?: string;
      jobTitle?: string;
      // Location
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      password?: string;
    },
  ): Promise<SafeUser> {
    const updateData: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      displayName: data.displayName,
      language: data.language,
      website: data.website,
      // Contact
      phoneNumber: data.phoneNumber,
      countryCode: data.countryCode,
      alternateEmail: data.alternateEmail,
      whatsapp: data.whatsapp,
      fax: data.fax,
      // Social
      facebook: data.facebook,
      twitter: data.twitter,
      instagram: data.instagram,
      linkedin: data.linkedin,
      youtube: data.youtube,
      tiktok: data.tiktok,
      telegram: data.telegram,
      github: data.github,
      pinterest: data.pinterest,
      snapchat: data.snapchat,
      // Professional
      bio: data.bio,
      company: data.company,
      jobTitle: data.jobTitle,
      // Location
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country,
    };

    if (typeof data.password === "string" && data.password.trim().length > 0) {
      validatePasswordStrength(data.password, this.config);
      updateData.password = await hashPassword(
        data.password,
        this.config.bcryptRounds,
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: UserService.SAFE_SELECT,
    });
  }

  async updateUserRole(userId: string, role: UserRole): Promise<SafeUser> {
    if (!USER_ROLES.includes(role)) {
      throw new ValidationError(`Invalid role: ${role}`);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: UserService.SAFE_SELECT,
    });
  }

  // ─── Bulk Operations ──────────────────────────────────────────────────

  async bulkUpdateRoles(
    userIds: string[],
    role: UserRole,
  ): Promise<{ updated: number; role: UserRole; ids: string[] }> {
    const ids = this.normalizeIds(userIds);
    if (ids.length === 0) throw new ValidationError("No user IDs provided");
    if (!USER_ROLES.includes(role))
      throw new ValidationError(`Invalid role: ${role}`);

    if (role !== "SUPER_ADMIN") {
      await this.ensureSuperAdminSafety(ids, "update");
    }

    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role },
    });

    return { updated: (result as { count: number }).count, role, ids };
  }

  async bulkDeleteUsers(
    userIds: string[],
  ): Promise<{ deleted: number; ids: string[] }> {
    const ids = this.normalizeIds(userIds);
    if (ids.length === 0) throw new ValidationError("No user IDs provided");

    await this.ensureSuperAdminSafety(ids, "delete");

    const result = await this.prisma.user.deleteMany({
      where: { id: { in: ids } },
    });

    return { deleted: (result as { count: number }).count, ids };
  }

  async bulkVerifyEmail(
    userIds: string[],
    verified: boolean,
  ): Promise<{ updated: number; verified: boolean; ids: string[] }> {
    const ids = this.normalizeIds(userIds);
    if (ids.length === 0) throw new ValidationError("No user IDs provided");

    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: {
        isEmailVerified: verified,
        emailVerifiedAt: verified ? new Date() : null,
      },
    });

    return { updated: (result as { count: number }).count, verified, ids };
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, username: true },
    });

    if (!user) throw new NotFoundError("User not found");

    if (user.role === "SUPER_ADMIN") {
      const count = await this.prisma.user.count({
        where: { role: "SUPER_ADMIN" },
      });
      if (count <= 1) {
        throw new ValidationError(
          "Cannot delete the last Super Admin account. Please create another Super Admin before deleting this account.",
        );
      }
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }

  // ─── Password Change (self-service) ──────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!this.config.allowPasswordChange) {
      throw new ValidationError("Password changes are currently disabled");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new ValidationError("Current password is incorrect");

    validatePasswordStrength(newPassword, this.config);
    const hashed = await hashPassword(newPassword, this.config.bcryptRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: "Password changed successfully" };
  }

  // ─── My Profile (end-user self-service) ───────────────────────────────

  /**
   * Get the currently authenticated user's own profile.
   * Same data shape as getUserById — convenience alias for "me" endpoints.
   */
  async getMyProfile(
    userId: string,
  ): Promise<SafeUser & { postsCount: number }> {
    return this.getUserById(userId);
  }

  /**
   * Self-service account deletion.
   * Requires `allowSelfDeletion` to be enabled in admin settings.
   * Password confirmation prevents accidental deletion.
   */
  async deleteMyAccount(
    userId: string,
    password: string,
  ): Promise<{ message: string }> {
    if (!this.config.allowSelfDeletion) {
      throw new ValidationError("Account self-deletion is currently disabled");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    // Prevent deleting the last Super Admin
    if (user.role === "SUPER_ADMIN") {
      const count = await this.prisma.user.count({
        where: { role: "SUPER_ADMIN" },
      });
      if (count <= 1) {
        throw new ValidationError(
          "Cannot delete the last Super Admin account. Please create another Super Admin first.",
        );
      }
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new ValidationError("Password is incorrect");

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: "Account deleted successfully" };
  }

  /**
   * Self-service username change.
   * Requires `allowUsernameChange` to be enabled in admin settings.
   */
  async changeUsername(userId: string, newUsername: string): Promise<SafeUser> {
    if (!this.config.allowUsernameChange) {
      throw new ValidationError("Username changes are currently disabled");
    }

    const sanitized = sanitizeSlug(newUsername);
    if (!sanitized || sanitized.length < 3) {
      throw new ValidationError("Username must be at least 3 characters");
    }

    const existing = await this.prisma.user.findUnique({
      where: { username: sanitized },
    });
    if (existing && existing.id !== userId) {
      throw new ValidationError("Username already taken");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { username: sanitized },
      select: UserService.SAFE_SELECT,
    });
  }

  // ─── Admin: Password Reset for Users ──────────────────────────────────

  /**
   * Admin resets a user's password.
   * Unlike the self-service `changePassword`, this does NOT require the current
   * password and DOES revoke all active sessions (forces re-login).
   *
   * Works for any role including other admins — but the last Super Admin's
   * password can still be reset (they're not being deleted).
   */
  async adminResetUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    validatePasswordStrength(newPassword, this.config);
    const hashed = await hashPassword(newPassword, this.config.bcryptRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Revoke all sessions — force re-login with new password
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      message:
        "Password reset successfully. All user sessions have been revoked.",
    };
  }

  // ─── Admin: Create User Directly ──────────────────────────────────────

  /**
   * Admin creates a user directly (bypasses registration flow).
   * Optionally pre-verifies email and assigns any role.
   * Useful for admin panels, bulk user provisioning, or invites.
   */
  async adminCreateUser(data: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isEmailVerified?: boolean;
  }): Promise<SafeUser> {
    const normalEmail = sanitizeEmail(data.email);
    if (!normalEmail) throw new ValidationError("Invalid email format");

    const existing = await this.prisma.user.findUnique({
      where: { email: normalEmail },
    });
    if (existing) throw new ValidationError("Email already registered");

    validatePasswordStrength(data.password, this.config);
    const hashedPw = await hashPassword(
      data.password,
      this.config.bcryptRounds,
    );

    // Generate unique username
    const baseUsername = sanitizeSlug(
      data.username || normalEmail.split("@")[0],
    );
    let username = baseUsername;
    let counter = 1;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > 100) {
        throw new Error(
          "Unable to generate a unique username after 100 attempts",
        );
      }
    }

    const role: UserRole =
      data.role && USER_ROLES.includes(data.role)
        ? data.role
        : this.config.defaultRole;

    const user = await this.prisma.user.create({
      data: {
        username,
        email: normalEmail,
        password: hashedPw,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        role,
        isEmailVerified: data.isEmailVerified ?? false,
        emailVerifiedAt: data.isEmailVerified ? new Date() : undefined,
      },
    });

    return this.stripSensitiveFields(
      user as unknown as Record<string, unknown>,
    );
  }

  // ─── Admin: User Detail View ──────────────────────────────────────────

  /**
   * Admin fetches detailed user info including sessions and pending requests.
   * Returns richer data than getUserById.
   */
  async adminGetUserDetail(userId: string): Promise<{
    user: SafeUser & { postsCount: number };
    activeSessions: number;
    pendingEmailChange: boolean;
  }> {
    const user = await this.getUserById(userId);

    const [activeSessions, pendingEmailChange] = await Promise.all([
      this.prisma.userSession.count({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      this.prisma.emailChangeRequest.count({
        where: {
          userId,
          oldEmailVerified: true,
          newEmailVerified: true,
          adminApproved: false,
          completedAt: null,
        },
      }),
    ]);

    return {
      user,
      activeSessions,
      pendingEmailChange: pendingEmailChange > 0,
    };
  }

  // ─── Admin: Force Revoke All Sessions ─────────────────────────────────

  /**
   * Admin force-revokes all sessions for a user (instant logout).
   * Does NOT change the password — the user can log back in with same credentials.
   */
  async adminRevokeAllSessions(userId: string): Promise<{ revoked: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    const result = await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { revoked: (result as { count: number }).count };
  }

  // ─── Email Change Workflow ────────────────────────────────────────────

  async requestEmailChange(
    userId: string,
    newEmail: string,
  ): Promise<{
    requestId: string;
    message: string;
    oldEmailCode?: string;
    newEmailCode?: string;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    const existing = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existing) throw new ValidationError("Email already in use");

    const oldEmailCode = crypto.randomBytes(4).toString("hex").toUpperCase();
    const newEmailCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    // Hash codes before storing — consistent with how all other tokens are stored
    const oldEmailCodeHash = crypto
      .createHash("sha256")
      .update(oldEmailCode)
      .digest("hex");
    const newEmailCodeHash = crypto
      .createHash("sha256")
      .update(newEmailCode)
      .digest("hex");

    const request = await this.prisma.emailChangeRequest.create({
      data: {
        userId,
        oldEmail: user.email,
        newEmail,
        oldEmailCode: oldEmailCodeHash,
        newEmailCode: newEmailCodeHash,
        expiresAt: new Date(Date.now() + this.config.emailChangeExpiryMs),
      },
    });

    await this.mail.sendEmailChangeVerification(
      user.email,
      oldEmailCode,
      "OLD",
    );
    await this.mail.sendEmailChangeVerification(newEmail, newEmailCode, "NEW");

    return {
      requestId: request.id,
      message: "Verification codes sent to both email addresses",
      oldEmailCode:
        process.env.NODE_ENV === "development" ? oldEmailCode : undefined,
      newEmailCode:
        process.env.NODE_ENV === "development" ? newEmailCode : undefined,
    };
  }

  async verifyEmailChange(data: {
    requestId: string;
    oldEmailCode: string;
    newEmailCode: string;
  }): Promise<{ message: string; requestId: string }> {
    const request = await this.prisma.emailChangeRequest.findUnique({
      where: { id: data.requestId },
    });

    if (!request) throw new NotFoundError("Email change request not found");
    if (new Date() > request.expiresAt) {
      throw new ValidationError("Verification codes have expired");
    }

    const oldCodeHash = crypto
      .createHash("sha256")
      .update(data.oldEmailCode.toUpperCase())
      .digest("hex");
    const newCodeHash = crypto
      .createHash("sha256")
      .update(data.newEmailCode.toUpperCase())
      .digest("hex");

    const oldValid = request.oldEmailCode === oldCodeHash;
    const newValid = request.newEmailCode === newCodeHash;

    if (!oldValid || !newValid) {
      throw new ValidationError("Invalid verification codes");
    }

    await this.prisma.emailChangeRequest.update({
      where: { id: data.requestId },
      data: { oldEmailVerified: true, newEmailVerified: true },
    });

    const msg = this.config.emailChangeRequiresAdminApproval
      ? "Email addresses verified. Waiting for admin approval."
      : "Email change completed successfully.";

    // Auto-approve if admin approval is not required
    if (!this.config.emailChangeRequiresAdminApproval) {
      await this.approveEmailChange(request.id);
    }

    return { message: msg, requestId: request.id };
  }

  async approveEmailChange(requestId: string): Promise<{ message: string }> {
    const request = await this.prisma.emailChangeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundError("Email change request not found");
    if (!request.oldEmailVerified || !request.newEmailVerified) {
      throw new ValidationError("Email addresses not verified yet");
    }
    if (request.adminApproved) {
      throw new ValidationError("Request already approved");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail },
      }),
      this.prisma.emailChangeRequest.update({
        where: { id: requestId },
        data: { adminApproved: true, completedAt: new Date() },
      }),
    ]);

    return { message: "Email change approved and completed" };
  }

  async getPendingEmailChangeRequests() {
    return this.prisma.emailChangeRequest.findMany({
      where: {
        oldEmailVerified: true,
        newEmailVerified: true,
        adminApproved: false,
      },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private stripSensitiveFields(user: Record<string, unknown>): SafeUser {
    const safe = { ...user };
    delete safe.password;
    delete safe.resetPasswordToken;
    delete safe.resetPasswordExpires;
    return safe as unknown as SafeUser;
  }

  private getFormattedDisplayName(
    user: Pick<
      SafeUser,
      | "displayName"
      | "firstName"
      | "lastName"
      | "nickname"
      | "email"
      | "username"
    >,
  ): string {
    const displayType = user.displayName || "username";
    switch (displayType) {
      case "firstName":
        return user.firstName || user.username;
      case "lastName":
        return user.lastName || user.username;
      case "nickname":
        return user.nickname || user.username;
      case "email":
        return user.email;
      default:
        return user.username;
    }
  }

  private normalizeIds(ids: string[]): string[] {
    if (!Array.isArray(ids)) return [];
    const normalized = ids.map((id) => id.trim()).filter((id) => id.length > 0);
    return [...new Set(normalized)];
  }

  private async ensureSuperAdminSafety(
    userIds: string[],
    action: "delete" | "update",
  ): Promise<void> {
    const selectedCount = await this.prisma.user.count({
      where: { id: { in: userIds }, role: "SUPER_ADMIN" },
    });
    if (selectedCount === 0) return;

    const totalCount = await this.prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    });

    if (totalCount - selectedCount < 1) {
      throw new ValidationError(
        `Cannot ${action} the last Super Admin account. Please create another Super Admin first.`,
      );
    }
  }
}
