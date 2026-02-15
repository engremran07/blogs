// media-manager/admin-settings.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// CRUD service for media manager admin settings.
// Settings are stored in the consumer's database and cached.
// Follows the same pattern as `blog/admin-settings.service.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only';

import { MEDIA_DEFAULTS, CACHE_KEYS, CACHE_TTL } from './constants';
import type {
  MediaAdminSettings,
  MediaAdminSettingsServiceDeps,
  MediaCacheProvider,
  MediaLogger,
  MediaPrismaClient,
  ApiResponse,
} from '../types';

/* ====================================================================== *
 *  No‑op fallbacks                                                       *
 * ====================================================================== */

const noopLogger: MediaLogger = {
  info:  () => {},
  warn:  () => {},
  error: () => {},
  debug: () => {},
};

/* ====================================================================== *
 *  Helpers                                                               *
 * ====================================================================== */

function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { success: true, data, meta };
}

function fail<T>(code: string, message: string): ApiResponse<T> {
  return { success: false, data: null, error: { code, message } };
}

/* ====================================================================== *
 *  Admin settings storage contract                                       *
 * ====================================================================== */

/**
 * Narrow Prisma delegate for admin‑settings persistence.
 * The consumer's Prisma schema should include a `mediaSettings`
 * (or equivalent) model.
 */
export interface MediaSettingsPrismaDelegate {
  findFirst(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  }): Promise<MediaAdminSettings | null>;

  upsert(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<MediaAdminSettings>;
}

/* ====================================================================== *
 *  MediaAdminSettingsService                                             *
 * ====================================================================== */

export class MediaAdminSettingsService {
  private readonly prisma: MediaPrismaClient;
  private readonly cache: MediaCacheProvider | null;
  private readonly log: MediaLogger;

  constructor(deps: MediaAdminSettingsServiceDeps) {
    this.prisma = deps.prisma;
    this.cache  = deps.cache ?? null;
    this.log    = deps.logger ?? noopLogger;
  }

  /* ------------------------------------------------------------------ *
   *  GET                                                                *
   * ------------------------------------------------------------------ */

  /**
   * Retrieve the current admin settings, merging stored values over
   * module defaults.  Returns defaults if no stored settings exist.
   */
  async getSettings(): Promise<ApiResponse<MediaAdminSettings>> {
    // Cache first
    if (this.cache) {
      const cached = await this.cache.get<MediaAdminSettings>(CACHE_KEYS.adminSettings());
      if (cached) return ok(cached);
    }

    try {
      // Convention: settings delegate lives on the prisma client
      // under a key the consumer maps.  We use a generic approach:
      // look for a single row in whatever model is mapped.
      const stored = await (this.prisma as unknown as { mediaSettings?: MediaSettingsPrismaDelegate })
        .mediaSettings?.findFirst?.({});

      const merged: MediaAdminSettings = {
        ...MEDIA_DEFAULTS,
        ...stripNulls(stored as Record<string, unknown> ?? {}),
      };

      if (this.cache) {
        await this.cache.set(CACHE_KEYS.adminSettings(), merged, CACHE_TTL.ADMIN_SETTINGS);
      }

      return ok(merged);
    } catch (err) {
      this.log.warn('Failed to load admin settings, using defaults', { error: String(err) });
      return ok({ ...MEDIA_DEFAULTS });
    }
  }

  /* ------------------------------------------------------------------ *
   *  UPDATE                                                             *
   * ------------------------------------------------------------------ */

  /**
   * Upsert admin settings.  Only provided keys are overwritten; omitted
   * keys retain their stored (or default) values.
   */
  async updateSettings(
    input: Partial<MediaAdminSettings>,
    userId?: string,
  ): Promise<ApiResponse<MediaAdminSettings>> {
    try {
      const delegate = (this.prisma as unknown as { mediaSettings?: MediaSettingsPrismaDelegate }).mediaSettings;
      if (!delegate) {
        return fail('NO_SETTINGS_MODEL', 'Media settings model is not configured in Prisma');
      }

      const data: Record<string, unknown> = {
        ...input,
        updatedAt: new Date(),
        updatedBy: userId ?? null,
      };

      const result = await delegate.upsert({
        where:  { id: 'default' },
        create: { id: 'default', ...data },
        update: data,
      });

      // Invalidate cache
      if (this.cache) {
        await this.cache.del(CACHE_KEYS.adminSettings());
      }

      this.log.info('Admin settings updated', { userId });

      const merged: MediaAdminSettings = {
        ...MEDIA_DEFAULTS,
        ...stripNulls(result as unknown as Record<string, unknown>),
      };

      return ok(merged);
    } catch (err) {
      this.log.error('Failed to update admin settings', { error: String(err) });
      return fail('UPDATE_FAILED', 'Failed to update admin settings');
    }
  }

  /* ------------------------------------------------------------------ *
   *  RESET                                                              *
   * ------------------------------------------------------------------ */

  /**
   * Reset all admin settings back to module defaults.
   */
  async resetSettings(): Promise<ApiResponse<MediaAdminSettings>> {
    try {
      const delegate = (this.prisma as unknown as { mediaSettings?: MediaSettingsPrismaDelegate }).mediaSettings;
      if (delegate) {
        await delegate.upsert({
          where:  { id: 'default' },
          create: { id: 'default', ...(MEDIA_DEFAULTS as unknown as Record<string, unknown>) },
          update: { ...(MEDIA_DEFAULTS as unknown as Record<string, unknown>), updatedAt: new Date() },
        });
      }

      if (this.cache) {
        await this.cache.del(CACHE_KEYS.adminSettings());
      }

      this.log.info('Admin settings reset to defaults');
      return ok({ ...MEDIA_DEFAULTS });
    } catch (err) {
      this.log.error('Failed to reset admin settings', { error: String(err) });
      return fail('RESET_FAILED', 'Failed to reset admin settings');
    }
  }
}

/* ====================================================================== *
 *  Private helpers                                                       *
 * ====================================================================== */

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null) result[k] = v;
  }
  return result;
}
