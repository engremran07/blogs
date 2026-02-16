/**
 * ============================================================================
 * MODULE:   features/auth/admin-settings.service.ts
 * PURPOSE:  DB-backed dynamic admin settings — fully configurable at runtime.
 *           Same consumer-propagation pattern as captcha/editor/comments.
 *
 * Features:
 *   - Singleton `UserSettings` row in the database
 *   - Cached in-memory, invalidated on update
 *   - Kill switches: registration, login
 *   - Simple / full config modes via presets
 *   - Consumer propagation → AuthService, UserService auto-update
 * ============================================================================
 */

import type {
  UserConfig,
  UserSystemSettings,
  UserConfigConsumer,
  UsersPrismaClient,
  ApiResponse,
} from '../types';
import { DEFAULT_USER_CONFIG } from './constants';
import { updateUserSettingsSchema } from './schemas';

// ─── Service ────────────────────────────────────────────────────────────────

export class UserAdminSettingsService {
  private consumers: UserConfigConsumer[] = [];
  private cached: UserSystemSettings | null = null;

  constructor(private readonly prisma: UsersPrismaClient) {}

  // ─── Consumer Registration ──────────────────────────────────────────────

  /**
   * Register a service to receive config updates when admin changes settings.
   * Call during bootstrap for AuthService, UserService, etc.
   */
  registerConsumer(consumer: UserConfigConsumer): void {
    this.consumers.push(consumer);
  }

  // ─── Read Settings ──────────────────────────────────────────────────────

  /** Get current settings (cached). Creates default row if none exists. */
  async getSettings(): Promise<UserSystemSettings> {
    if (this.cached) return this.cached;
    return this.loadFromDb();
  }

  /** Get current config (without DB audit fields). */
  async getConfig(): Promise<UserConfig> {
    const settings = await this.getSettings();
    return this.settingsToConfig(settings);
  }

  /** Get settings wrapped in ApiResponse. */
  async getSettingsResponse(): Promise<ApiResponse<UserSystemSettings>> {
    try {
      const settings = await this.getSettings();
      return {
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SETTINGS_READ_ERROR',
          message: error instanceof Error ? error.message : 'Failed to read settings',
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ─── Update Settings ────────────────────────────────────────────────────

  /** Partial update — only provided fields are changed. */
  async updateSettings(
    updates: Record<string, unknown>,
    updatedBy?: string,
  ): Promise<ApiResponse<UserSystemSettings>> {
    try {
      const parsed = updateUserSettingsSchema.parse(updates);
      const current = await this.getSettings();

      const data: Record<string, unknown> = {
        ...parsed,
        updatedAt: new Date(),
      };
      if (updatedBy) data.updatedBy = updatedBy;

      const updated = await this.prisma.userSettings.update({
        where: { id: current.id },
        data,
      });

      this.cached = updated as unknown as UserSystemSettings;
      this.propagateToConsumers();

      return {
        success: true,
        data: this.cached,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update settings',
          statusCode: 400,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** Reset all settings to defaults. */
  async resetToDefaults(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings(
      { ...DEFAULT_USER_CONFIG } as unknown as Record<string, unknown>,
      updatedBy,
    );
  }

  // ─── Kill Switches ──────────────────────────────────────────────────────

  /** Disable all registration — emergency kill switch. */
  async disableRegistration(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings({ registrationEnabled: false }, updatedBy);
  }

  /** Re-enable registration. */
  async enableRegistration(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings({ registrationEnabled: true }, updatedBy);
  }

  /** Disable login — emergency lockdown. */
  async disableLogin(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings({ loginEnabled: false }, updatedBy);
  }

  /** Re-enable login. */
  async enableLogin(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings({ loginEnabled: true }, updatedBy);
  }

  // ─── Presets ──────────────────────────────────────────────────────────────

  /** Strict security preset — stronger passwords, shorter sessions, CAPTCHA on. */
  async applyStrictPreset(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings(
      {
        passwordMinLength: 16,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireDigit: true,
        passwordRequireSpecialChar: true,
        maxLoginAttempts: 3,
        lockoutDurationMs: 30 * 60 * 1000, // 30 min
        accessTokenExpiryMs: 5 * 60 * 1000, // 5 min
        maxActiveSessions: 3,
        requireCaptchaOnLogin: true,
        requireCaptchaOnRegister: true,
        requireCaptchaOnPasswordReset: true,
        requireEmailVerification: true,
        emailChangeRequiresAdminApproval: true,
        allowSelfDeletion: false,
        csrfEnabled: true,
        bcryptRounds: 14,
      },
      updatedBy,
    );
  }

  /** Relaxed preset — for development or low-risk environments. */
  async applyRelaxedPreset(updatedBy?: string): Promise<ApiResponse<UserSystemSettings>> {
    return this.updateSettings(
      {
        passwordMinLength: 8,
        passwordRequireSpecialChar: false,
        maxLoginAttempts: 10,
        lockoutDurationMs: 5 * 60 * 1000, // 5 min
        accessTokenExpiryMs: 60 * 60 * 1000, // 1 hour
        maxActiveSessions: 0, // unlimited
        requireCaptchaOnLogin: false,
        requireCaptchaOnRegister: false,
        requireCaptchaOnPasswordReset: false,
        requireEmailVerification: false,
        emailChangeRequiresAdminApproval: false,
        allowSelfDeletion: true,
        bcryptRounds: 10,
      },
      updatedBy,
    );
  }

  // ─── Cache Invalidation ──────────────────────────────────────────────────

  /** Force reload from DB on next access. */
  invalidateCache(): void {
    this.cached = null;
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private async loadFromDb(): Promise<UserSystemSettings> {
    const existing = await this.prisma.userSettings.findFirst();

    if (existing) {
      this.cached = existing as unknown as UserSystemSettings;
      return this.cached;
    }

    // First run — seed with defaults
    const created = await this.prisma.userSettings.create({
      data: {
        ...DEFAULT_USER_CONFIG,
        updatedAt: new Date(),
      } as Record<string, unknown>,
    });

    this.cached = created as unknown as UserSystemSettings;
    return this.cached;
  }

  private settingsToConfig(settings: UserSystemSettings): UserConfig {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const { id: _id, updatedBy: _ub, updatedAt: _ua, ...config } = settings;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return config as UserConfig;
  }

  private propagateToConsumers(): void {
    if (!this.cached) return;
    const config = this.settingsToConfig(this.cached);
    for (const consumer of this.consumers) {
      try {
        consumer.updateConfig(config);
      } catch {
        // Consumer errors should not break settings propagation
      }
    }
  }
}
