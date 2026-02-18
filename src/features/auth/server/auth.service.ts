/**
 * ============================================================================
 * MODULE:   features/auth/auth.service.ts
 * PURPOSE:  Authentication logic — framework-agnostic.
 *           Login, registration, JWT refresh, email verification,
 *           password reset, rate limiting, session management.
 *
 * MIGRATION NOTES (NestJS → framework-agnostic):
 *   - @Injectable() removed — plain class with constructor DI
 *   - NestJS exceptions → AuthError / ValidationError
 *   - @nestjs/jwt → JwtSigner interface (jose, jsonwebtoken, etc.)
 *   - PrismaService → UsersPrismaClient interface
 *   - MailService → MailProvider interface
 *   - Hardcoded values → UserConfig from admin settings
 *   - Duplicated validatePasswordStrength → password.util.ts
 * ============================================================================
 */

import * as crypto from 'crypto';
import type {
  UserConfig,
  UserConfigConsumer,
  UsersPrismaClient,
  JwtSigner,
  MailProvider,
  CaptchaProvider,
  SafeUser,
  AuthResult,
  SessionContext,
} from '../types';
import { AuthError, ValidationError } from '../types';
import { DEFAULT_USER_CONFIG, msToExpiresIn, USER_SENSITIVE_FIELDS } from './constants';
import { hashPassword, comparePassword, validatePasswordStrength } from './password.util';
import { sanitizeEmail, sanitizeText, sanitizeSlug } from './sanitization.util';
import { createLogger } from '@/server/observability/logger';

// ─── Logger interface — keeps service framework-agnostic ────────────────────

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const _authLogger = createLogger('auth');
const consoleLogger: Logger = {
  log: (m) => _authLogger.info(m),
  warn: (m) => _authLogger.warn(m),
  error: (m) => _authLogger.error(m),
};

// ─── Service ────────────────────────────────────────────────────────────────

export class AuthService implements UserConfigConsumer {
  private config: UserConfig;
  private readonly logger: Logger;

  constructor(
    private readonly prisma: UsersPrismaClient,
    private readonly jwt: JwtSigner,
    private readonly mail: MailProvider,
    private readonly captcha: CaptchaProvider | null = null,
    config?: Partial<UserConfig>,
    logger?: Logger,
  ) {
    this.config = { ...DEFAULT_USER_CONFIG, ...config };
    this.logger = logger ?? consoleLogger;
  }

  /** Called by AdminSettingsService when admin changes config. */
  updateConfig(cfg: UserConfig): void {
    this.config = cfg;
  }

  /** Expose current config (read-only copy). */
  getConfig(): Readonly<UserConfig> {
    return { ...this.config };
  }

  // ─── Credential Validation ──────────────────────────────────────────────

  /**
   * Validate user credentials.
   * Returns a safe user object (no password / reset fields).
   *
   * Note: Login rate-limiting is handled at the proxy level via @upstash/ratelimit.
   * NextAuth's authorize() callback handles actual authentication flow.
   */
  async validateUser(email: string, password: string): Promise<SafeUser> {
    const normalEmail = sanitizeEmail(email);
    if (!normalEmail) {
      throw new ValidationError('Invalid email format');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalEmail },
    });

    if (!user) {
      throw new AuthError('Invalid credentials');
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      throw new AuthError('Invalid credentials');
    }

    return this.stripSensitiveFields(user);
  }

  // ─── Login ──────────────────────────────────────────────────────────────

  /**
   * Authenticate and generate JWT access + refresh tokens.
   */
  async login(
    user: { id: string; email: string; role: string },
    context?: SessionContext,
  ): Promise<AuthResult> {
    if (!this.config.loginEnabled) {
      throw new AuthError('Login is currently disabled', 403);
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    const accessToken = await this.jwt.sign(payload, {
      expiresIn: msToExpiresIn(this.config.accessTokenExpiryMs),
    });

    const sessionId = crypto.randomUUID();
    const refreshToken = await this.jwt.sign(
      { sub: user.id, tokenType: 'refresh', sid: sessionId },
      {
        expiresIn: msToExpiresIn(this.config.refreshTokenExpiryMs),
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      },
    );

    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.config.refreshTokenExpiryMs);

    // Enforce max active sessions
    if (this.config.maxActiveSessions > 0) {
      await this.enforceSessionLimit(user.id);
    }

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        userAgent: context?.userAgent,
        ipAddress: context?.ipAddress,
        expiresAt,
      },
    });

    // Fetch full user to return safe fields (caller may pass minimal object)
    const fullUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    return {
      accessToken,
      refreshToken,
      user: fullUser ? this.stripSensitiveFields(fullUser) : (user as SafeUser),
    };
  }

  // ─── Registration ──────────────────────────────────────────────────────

  async register(data: {
    email: string;
    password: string;
    name: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<SafeUser> {
    if (!this.config.registrationEnabled) {
      throw new AuthError('Registration is currently disabled', 403);
    }

    const normalEmail = sanitizeEmail(data.email);
    if (!normalEmail) {
      throw new ValidationError('Invalid email format');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: normalEmail },
    });
    if (existing) {
      throw new ValidationError('Email already registered');
    }

    validatePasswordStrength(data.password, this.config);

    const hashedPw = await hashPassword(data.password, this.config.bcryptRounds);

    // Generate unique username
    const baseUsername = sanitizeSlug(data.username || normalEmail.split('@')[0]);
    let username = baseUsername;
    let counter = 1;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const firstName = sanitizeText(data.firstName || data.name?.split(' ')[0] || '');
    const lastName = sanitizeText(data.lastName || data.name?.split(' ').slice(1).join(' ') || '');

    try {
      const user = await this.prisma.user.create({
        data: {
          username,
          email: normalEmail,
          password: hashedPw,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          role: this.config.defaultRole,
        },
      });

      this.logger.log(`New user registered: ${user.email}`);

      // Fire-and-forget emails
      this.mail.sendWelcomeEmail(user.email, user.firstName).catch((err: unknown) => {
        this.logger.error(`Failed to send welcome email: ${this.errorMsg(err)}`);
      });

      if (this.config.requireEmailVerification) {
        const verification = await this.createEmailVerificationToken(user.id);
        this.mail
          .sendEmailVerification(user.email, verification.token, verification.code)
          .catch((err: unknown) => {
            this.logger.error(`Failed to send verification email: ${this.errorMsg(err)}`);
          });
      }

      return this.stripSensitiveFields(user);
    } catch (error: unknown) {
      this.logger.error(`Registration failed: ${this.errorMsg(error)}`);
      throw new ValidationError('Registration failed. Please try again.');
    }
  }

  // ─── Forgot / Reset Password ──────────────────────────────────────────

  async forgotPassword(email: string): Promise<{
    message: string;
    dev_token?: string;
  }> {
    const normalEmail = sanitizeEmail(email);
    const GENERIC_MSG = 'If this email exists, a password reset link has been sent.';

    if (!normalEmail) return { message: GENERIC_MSG };

    const user = await this.prisma.user.findUnique({
      where: { email: normalEmail },
    });
    if (!user) return { message: GENERIC_MSG };

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(token);
    const expires = new Date(Date.now() + this.config.passwordResetExpiryMs);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires,
      },
    });

    try {
      await this.mail.sendPasswordReset(user.email, token);
      this.logger.log(`Password reset requested for: ${user.email}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send password reset email: ${this.errorMsg(error)}`);
    }

    return {
      message: 'Password reset link sent.',
      dev_token: process.env.NODE_ENV === 'development' ? token : undefined,
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    validatePasswordStrength(newPassword, this.config);

    const hashedToken = this.hashToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AuthError('Invalid or expired token');
    }

    const hashedPw = await hashPassword(newPassword, this.config.bcryptRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPw,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Revoke all active sessions
    await this.prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.mail.sendPasswordResetConfirmation(user.email).catch((err: unknown) => {
      this.logger.error(`Failed to send reset confirmation email: ${this.errorMsg(err)}`);
    });

    this.logger.log(`Password reset successful for user: ${user.email}`);
    return { message: 'Password successfully reset' };
  }

  // ─── Refresh Tokens ───────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      const decoded = await this.jwt.verify<{
        sub?: string;
        tokenType?: string;
        sid?: string;
      }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      if (decoded.tokenType !== 'refresh' || !decoded.sub) {
        throw new AuthError('Invalid token type');
      }

      const refreshTokenHash = this.hashToken(refreshToken);
      const session = await this.prisma.userSession.findFirst({
        where: {
          refreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session || (decoded.sid && session.id !== decoded.sid)) {
        throw new AuthError('Session expired');
      }

      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) throw new AuthError('User not found');

      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = await this.jwt.sign(payload, {
        expiresIn: msToExpiresIn(this.config.accessTokenExpiryMs),
      });

      const newRefresh = await this.jwt.sign(
        { sub: user.id, tokenType: 'refresh', sid: session.id },
        {
          expiresIn: msToExpiresIn(this.config.refreshTokenExpiryMs),
          secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        },
      );

      await this.prisma.userSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: this.hashToken(newRefresh),
          lastUsedAt: new Date(),
        },
      });

      return {
        accessToken,
        refreshToken: newRefresh,
        user: this.stripSensitiveFields(user),
      };
    } catch (err: unknown) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('Invalid or expired refresh token');
    }
  }

  // ─── Session Management ───────────────────────────────────────────────

  async revokeSession(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(userId: string): Promise<{ revoked: number }> {
    const result = await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: (result as { count: number }).count };
  }

  async getActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  // ─── Email Verification ───────────────────────────────────────────────

  async requestEmailVerification(userId: string): Promise<{
    message: string;
    dev_token?: string;
    dev_code?: string;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ValidationError('User not found');

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    const verification = await this.createEmailVerificationToken(user.id);
    await this.mail.sendEmailVerification(user.email, verification.token, verification.code);

    return {
      message: 'Verification email sent',
      dev_token: process.env.NODE_ENV === 'development' ? verification.token : undefined,
      dev_code: process.env.NODE_ENV === 'development' ? verification.code : undefined,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const verification = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new AuthError('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async verifyEmailCode(email: string, code: string): Promise<{ message: string }> {
    const normalEmail = sanitizeEmail(email);
    if (!normalEmail) throw new ValidationError('Invalid email format');

    const codeRegex = new RegExp(`^\\d{${this.config.emailVerificationCodeLength}}$`);
    if (!code || !codeRegex.test(code)) {
      throw new ValidationError(
        `Verification code must be ${this.config.emailVerificationCodeLength} digits`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: normalEmail } });
    if (!user) throw new ValidationError('Invalid or expired verification code');

    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    const codeHash = this.hashToken(code);
    const verification = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        codeHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new AuthError('Invalid or expired verification code');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true, emailVerifiedAt: new Date() },
      }),
    ]);

    return { message: 'Email verified successfully' };
  }

  // ─── CAPTCHA Verification (optional) ──────────────────────────────────

  async verifyCaptcha(
    token: string | undefined,
    ip: string,
    captchaId?: string,
    captchaType?: string,
  ): Promise<void> {
    if (!this.captcha) return;
    if (!token) throw new ValidationError('CAPTCHA token is required');

    const valid = await this.captcha.verify(token, ip, captchaId, captchaType);
    if (!valid) throw new ValidationError('CAPTCHA verification failed');
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateVerificationCode(): string {
    const len = this.config.emailVerificationCodeLength;
    let code = '';
    for (let i = 0; i < len; i++) {
      code += crypto.randomInt(0, 10).toString();
    }
    return code;
  }

  private async createEmailVerificationToken(
    userId: string,
  ): Promise<{ token: string; code: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const code = this.generateVerificationCode();
    const codeHash = this.hashToken(code);
    const expiresAt = new Date(Date.now() + this.config.emailVerificationExpiryMs);

    // Invalidate outstanding tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, codeHash, expiresAt },
    });

    return { token, code };
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private stripSensitiveFields(user: any): SafeUser {
    const safe = { ...user };
    for (const field of USER_SENSITIVE_FIELDS) {
      delete safe[field];
    }
    return safe as SafeUser;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  private errorMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  /** Revoke oldest sessions when user exceeds max active sessions. */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    if (sessions.length >= this.config.maxActiveSessions) {
      // Sort by lastUsedAt ascending → revoke the oldest
      const sorted = sessions.sort(
        (a: { lastUsedAt?: Date; createdAt: Date }, b: { lastUsedAt?: Date; createdAt: Date }) =>
          (a.lastUsedAt ?? a.createdAt).getTime() - (b.lastUsedAt ?? b.createdAt).getTime(),
      );
      const toRevoke = sorted.slice(0, sorted.length - this.config.maxActiveSessions + 1);
      for (const s of toRevoke) {
        await this.prisma.userSession.update({
          where: { id: s.id },
          data: { revokedAt: new Date() },
        });
      }
    }
  }
}
