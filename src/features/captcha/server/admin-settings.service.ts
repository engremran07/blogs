// captcha/admin-settings.service.ts
// DB-backed dynamic admin settings — fully configurable at runtime
// Same consumer-propagation pattern as comments/admin-settings.service.ts

import type {
  CaptchaPrismaClient,
  CaptchaConfig,
  CaptchaSystemSettings,
  CaptchaConfigConsumer,
  CaptchaStats,
  CaptchaProviderType,
  CaptchaMode,
} from "../types";
import { DEFAULT_CAPTCHA_CONFIG } from "../utils/constants";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("captcha/admin-settings");

// ─── Service map for per-service requirements ───────────────────────────────

type ServiceName =
  | "login"
  | "registration"
  | "comments"
  | "contact"
  | "passwordReset"
  | "newsletter";

const SERVICE_FIELD_MAP: Record<ServiceName, keyof CaptchaSystemSettings> = {
  login: "requireCaptchaForLogin",
  registration: "requireCaptchaForRegistration",
  comments: "requireCaptchaForComments",
  contact: "requireCaptchaForContact",
  passwordReset: "requireCaptchaForPasswordReset",
  newsletter: "requireCaptchaForNewsletter",
};

// ─── Admin Settings Service ─────────────────────────────────────────────────

export class CaptchaAdminSettingsService {
  private consumers: CaptchaConfigConsumer[] = [];
  private cached: CaptchaSystemSettings | null = null;

  constructor(private readonly prisma: CaptchaPrismaClient) {}

  // ─── Consumer Registration ──────────────────────────────────────────────

  /**
   * Register a service to receive config updates when admin changes settings.
   * Call this during bootstrap for verification service, challenge service, etc.
   */
  registerConsumer(consumer: CaptchaConfigConsumer): void {
    this.consumers.push(consumer);
  }

  // ─── Read Settings ──────────────────────────────────────────────────────

  /** Get current settings (cached). Creates default row if none exists. */
  async getSettings(): Promise<CaptchaSystemSettings> {
    if (this.cached) return this.cached;
    return this.loadFromDb();
  }

  /** Force reload from DB — use after external DB changes */
  async reloadSettings(): Promise<CaptchaSystemSettings> {
    this.cached = null;
    const settings = await this.loadFromDb();
    await this.propagateConfig(settings);
    return settings;
  }

  // ─── Update Settings ────────────────────────────────────────────────────

  /**
   * Partial update — only send changed fields from admin panel.
   * Automatically propagates to all registered services.
   */
  async updateSettings(
    changes: Partial<Omit<CaptchaSystemSettings, "id" | "updatedAt">>,
    updatedBy: string,
  ): Promise<CaptchaSystemSettings> {
    const current = await this.getSettings();

    const updated = await this.prisma.captchaSettings.update({
      where: { id: current.id },
      data: {
        ...changes,
        updatedBy,
        updatedAt: new Date(),
      },
    });

    this.cached = updated;
    await this.propagateConfig(this.cached);
    return this.cached;
  }

  // ─── Kill Switch ────────────────────────────────────────────────────────

  /**
   * Emergency kill switch — disable all captcha system-wide.
   * Use for incidents where captcha is blocking legitimate users.
   */
  async disableAll(updatedBy: string): Promise<CaptchaSystemSettings> {
    return this.updateSettings({ captchaEnabled: false }, updatedBy);
  }

  /** Re-enable captcha after kill switch */
  async enableAll(updatedBy: string): Promise<CaptchaSystemSettings> {
    return this.updateSettings({ captchaEnabled: true }, updatedBy);
  }

  // ─── Per-Provider Toggle ────────────────────────────────────────────────

  /** Enable or disable a specific provider */
  async toggleProvider(
    provider: CaptchaProviderType,
    enabled: boolean,
    updatedBy: string,
  ): Promise<CaptchaSystemSettings> {
    const fieldMap: Record<CaptchaProviderType, keyof CaptchaSystemSettings> = {
      turnstile: "enableTurnstile",
      "recaptcha-v3": "enableRecaptchaV3",
      "recaptcha-v2": "enableRecaptchaV2",
      hcaptcha: "enableHcaptcha",
      custom: "enableInhouse",
    };
    const field = fieldMap[provider];
    return this.updateSettings(
      { [field]: enabled } as Partial<CaptchaSystemSettings>,
      updatedBy,
    );
  }

  // ─── Per-Service Toggle ─────────────────────────────────────────────────

  /** Enable or disable captcha for a specific service */
  async toggleServiceCaptcha(
    service: ServiceName,
    required: boolean,
    updatedBy: string,
  ): Promise<CaptchaSystemSettings> {
    const field = SERVICE_FIELD_MAP[service];
    return this.updateSettings(
      { [field]: required } as Partial<CaptchaSystemSettings>,
      updatedBy,
    );
  }

  // ─── Captcha Requirement Check ──────────────────────────────────────────

  /**
   * Check whether captcha is required for a given service + context.
   * Call this in your API routes before rendering captcha or verifying.
   *
   * Returns { required: false } when:
   *   - captchaEnabled === false (global kill switch)
   *   - captchaMode === 'disabled'
   *   - The specific service does not require captcha
   *   - User is authenticated and exemptAuthenticatedUsers is true
   *   - User is admin and exemptAdmins is true
   *   - Client IP is in exemptedIps list
   */
  async isCaptchaRequired(opts: {
    service: ServiceName;
    isAuthenticated?: boolean;
    isAdmin?: boolean;
    clientIp?: string;
  }): Promise<{ required: boolean; reason?: string }> {
    const settings = await this.getSettings();

    // Global kill switch
    if (!settings.captchaEnabled) {
      return { required: false, reason: "Captcha is globally disabled" };
    }

    // Mode check
    if ((settings.captchaMode as CaptchaMode) === "disabled") {
      return { required: false, reason: "Captcha mode is set to disabled" };
    }

    // Per-service check
    const serviceField = SERVICE_FIELD_MAP[opts.service];
    if (serviceField && !settings[serviceField]) {
      return {
        required: false,
        reason: `Captcha not required for ${opts.service}`,
      };
    }

    // Admin exemption
    if (opts.isAdmin && settings.exemptAdmins) {
      return { required: false, reason: "Admin users are exempt from captcha" };
    }

    // Authenticated user exemption
    if (opts.isAuthenticated && settings.exemptAuthenticatedUsers) {
      return {
        required: false,
        reason: "Authenticated users are exempt from captcha",
      };
    }

    // IP exemption
    if (opts.clientIp && settings.exemptedIps.length > 0) {
      if (settings.exemptedIps.includes(opts.clientIp)) {
        return { required: false, reason: "Client IP is in exempted list" };
      }
    }

    return { required: true };
  }

  // ─── Lockout Check ──────────────────────────────────────────────────────

  /**
   * Check if an IP is currently locked out due to too many failed attempts.
   * Requires a CaptchaAttempt model in prisma (see prisma-schema.reference.prisma).
   */
  async isLockedOut(clientIp: string): Promise<{
    lockedOut: boolean;
    retryAfterMs?: number;
    failedAttempts?: number;
  }> {
    const settings = await this.getSettings();

    if (settings.maxFailedAttempts <= 0) {
      return { lockedOut: false };
    }

    const windowStart = new Date(
      Date.now() - settings.lockoutDurationMinutes * 60 * 1000,
    );

    const failedCount = await this.prisma.captchaAttempt.count({
      where: {
        clientIp,
        success: false,
        createdAt: { gte: windowStart },
      },
    });

    if (failedCount >= settings.maxFailedAttempts) {
      // Find the oldest failure in the window to calculate retry-after
      const oldest = await this.prisma.captchaAttempt.findFirst({
        where: {
          clientIp,
          success: false,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const retryAfterMs = oldest
        ? (oldest.createdAt as Date).getTime() +
          settings.lockoutDurationMinutes * 60 * 1000 -
          Date.now()
        : settings.lockoutDurationMinutes * 60 * 1000;

      return {
        lockedOut: true,
        retryAfterMs: Math.max(0, retryAfterMs),
        failedAttempts: failedCount,
      };
    }

    return { lockedOut: false, failedAttempts: failedCount };
  }

  /**
   * Record a captcha attempt (success or failure).
   * Call this after every verification to feed the lockout system.
   */
  async recordAttempt(data: {
    clientIp: string;
    provider: string;
    success: boolean;
    score?: number;
    service?: string;
  }): Promise<void> {
    await this.prisma.captchaAttempt.create({
      data: {
        clientIp: data.clientIp,
        provider: data.provider,
        success: data.success,
        score: data.score ?? null,
        service: data.service ?? null,
      },
    });
  }

  // ─── Exempted IPs Management ────────────────────────────────────────────

  /** Add IPs to exempted list */
  async addExemptedIps(
    ips: string[],
    updatedBy: string,
  ): Promise<CaptchaSystemSettings> {
    const current = await this.getSettings();
    const existing = new Set(current.exemptedIps);
    for (const ip of ips) existing.add(ip.trim());
    return this.updateSettings({ exemptedIps: [...existing] }, updatedBy);
  }

  /** Remove IPs from exempted list */
  async removeExemptedIps(
    ips: string[],
    updatedBy: string,
  ): Promise<CaptchaSystemSettings> {
    const current = await this.getSettings();
    const toRemove = new Set(ips.map((ip) => ip.trim()));
    const filtered = current.exemptedIps.filter((ip) => !toRemove.has(ip));
    return this.updateSettings({ exemptedIps: filtered }, updatedBy);
  }

  // ─── Admin Overview ─────────────────────────────────────────────────────

  /**
   * Combined settings + live stats for admin dashboard.
   * Single endpoint for the admin panel to hydrate.
   */
  async getAdminOverview(): Promise<{
    settings: CaptchaSystemSettings;
    stats: CaptchaStats;
    enabledProviders: CaptchaProviderType[];
    enabledServices: ServiceName[];
  }> {
    const settings = await this.getSettings();

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Aggregate attempt stats
    const [totalAttempts, successfulAttempts, failedAttempts, lockedOut] =
      await Promise.all([
        this.prisma.captchaAttempt.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.captchaAttempt.count({
          where: { createdAt: { gte: oneDayAgo }, success: true },
        }),
        this.prisma.captchaAttempt.count({
          where: { createdAt: { gte: oneDayAgo }, success: false },
        }),
        this.countLockedOutIps(oneDayAgo, settings),
      ]);

    // Provider breakdown
    const providerBreakdown = await this.getProviderBreakdown(oneDayAgo);

    // Enabled providers
    const enabledProviders: CaptchaProviderType[] = [];
    if (settings.enableTurnstile) enabledProviders.push("turnstile");
    if (settings.enableRecaptchaV3) enabledProviders.push("recaptcha-v3");
    if (settings.enableRecaptchaV2) enabledProviders.push("recaptcha-v2");
    if (settings.enableHcaptcha) enabledProviders.push("hcaptcha");
    if (settings.enableInhouse) enabledProviders.push("custom");

    // Enabled services
    const enabledServices: ServiceName[] = [];
    for (const [service, field] of Object.entries(SERVICE_FIELD_MAP)) {
      if (settings[field]) enabledServices.push(service as ServiceName);
    }

    return {
      settings,
      stats: {
        totalAttempts24h: totalAttempts,
        successfulVerifications24h: successfulAttempts,
        failedVerifications24h: failedAttempts,
        successRate:
          totalAttempts > 0
            ? Math.round((successfulAttempts / totalAttempts) * 100)
            : 100,
        lockedOutCount: lockedOut,
        providerBreakdown,
      },
      enabledProviders,
      enabledServices,
    };
  }

  /**
   * Build the CaptchaSettings object to pass to the frontend Captcha component.
   * Merges DB-stored site keys with env vars, respects per-provider toggles.
   *
   * Usage in API route or SSR:
   *   const svc = new CaptchaAdminSettingsService(prisma);
   *   const frontendSettings = await svc.getFrontendSettings();
   *   // Pass to <Captcha settings={frontendSettings} />
   */
  async getFrontendSettings(): Promise<Record<string, unknown>> {
    const settings = await this.getSettings();

    if (
      !settings.captchaEnabled ||
      (settings.captchaMode as CaptchaMode) === "disabled"
    ) {
      return { captchaEnabled: false };
    }

    return {
      captchaEnabled: true,
      captchaType: settings.defaultProvider,

      // Site keys: DB value overrides env var
      turnstileSiteKey: settings.enableTurnstile
        ? settings.turnstileSiteKey ||
          process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
          undefined
        : undefined,
      recaptchaV3SiteKey: settings.enableRecaptchaV3
        ? settings.recaptchaV3SiteKey ||
          process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY ||
          undefined
        : undefined,
      recaptchaV2SiteKey: settings.enableRecaptchaV2
        ? settings.recaptchaV2SiteKey ||
          process.env.NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY ||
          undefined
        : undefined,
      hcaptchaSiteKey: settings.enableHcaptcha
        ? settings.hcaptchaSiteKey ||
          process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ||
          undefined
        : undefined,

      // Per-provider toggles (orchestrator uses these to skip disabled providers)
      enableTurnstile: settings.enableTurnstile,
      enableRecaptchaV3: settings.enableRecaptchaV3,
      enableRecaptchaV2: settings.enableRecaptchaV2,
      enableHcaptcha: settings.enableHcaptcha,
      enableInhouse: settings.enableInhouse,

      // Fallback
      fallbackOrder: settings.enableFallbackChain
        ? settings.fallbackOrder
        : undefined,

      // In-house config
      inhouseCodeLength: settings.inhouseCodeLength,
      inhouseChallengeTtlMs: settings.inhouseChallengeTtlMs,
      inhouseMaxRetries: settings.inhouseMaxRetries,
      inhouseChallengeEndpoint: settings.inhouseChallengeEndpoint,

      // Script
      scriptLoadTimeoutMs: settings.scriptLoadTimeoutMs,

      // Theme
      theme: settings.theme,
      size: settings.size,
    };
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  /**
   * Purge old captcha attempt records.
   * Run on a cron (e.g. daily) to keep the table lean.
   */
  async purgeOldAttempts(retentionDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.prisma.captchaAttempt.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private async loadFromDb(): Promise<CaptchaSystemSettings> {
    let row = await this.prisma.captchaSettings.findFirst();

    if (!row) {
      row = await this.prisma.captchaSettings.create({
        data: {
          // Global
          captchaEnabled: DEFAULT_CAPTCHA_CONFIG.captchaEnabled,
          captchaMode: DEFAULT_CAPTCHA_CONFIG.captchaMode,
          defaultProvider: DEFAULT_CAPTCHA_CONFIG.defaultProvider,
          enableFallbackChain: DEFAULT_CAPTCHA_CONFIG.enableFallbackChain,
          fallbackOrder: DEFAULT_CAPTCHA_CONFIG.fallbackOrder,

          // Per-provider
          enableTurnstile: DEFAULT_CAPTCHA_CONFIG.enableTurnstile,
          enableRecaptchaV3: DEFAULT_CAPTCHA_CONFIG.enableRecaptchaV3,
          enableRecaptchaV2: DEFAULT_CAPTCHA_CONFIG.enableRecaptchaV2,
          enableHcaptcha: DEFAULT_CAPTCHA_CONFIG.enableHcaptcha,
          enableInhouse: DEFAULT_CAPTCHA_CONFIG.enableInhouse,

          // Site keys
          turnstileSiteKey: DEFAULT_CAPTCHA_CONFIG.turnstileSiteKey,
          recaptchaV2SiteKey: DEFAULT_CAPTCHA_CONFIG.recaptchaV2SiteKey,
          recaptchaV3SiteKey: DEFAULT_CAPTCHA_CONFIG.recaptchaV3SiteKey,
          hcaptchaSiteKey: DEFAULT_CAPTCHA_CONFIG.hcaptchaSiteKey,

          // In-house
          inhouseCodeLength: DEFAULT_CAPTCHA_CONFIG.inhouseCodeLength,
          inhouseChallengeTtlMs: DEFAULT_CAPTCHA_CONFIG.inhouseChallengeTtlMs,
          inhouseMaxRetries: DEFAULT_CAPTCHA_CONFIG.inhouseMaxRetries,
          inhouseChallengeEndpoint:
            DEFAULT_CAPTCHA_CONFIG.inhouseChallengeEndpoint,

          // Script loading
          scriptLoadTimeoutMs: DEFAULT_CAPTCHA_CONFIG.scriptLoadTimeoutMs,

          // Per-service requirements
          requireCaptchaForLogin: DEFAULT_CAPTCHA_CONFIG.requireCaptchaForLogin,
          requireCaptchaForRegistration:
            DEFAULT_CAPTCHA_CONFIG.requireCaptchaForRegistration,
          requireCaptchaForComments:
            DEFAULT_CAPTCHA_CONFIG.requireCaptchaForComments,
          requireCaptchaForContact:
            DEFAULT_CAPTCHA_CONFIG.requireCaptchaForContact,
          requireCaptchaForPasswordReset:
            DEFAULT_CAPTCHA_CONFIG.requireCaptchaForPasswordReset,
          requireCaptchaForNewsletter:
            DEFAULT_CAPTCHA_CONFIG.requireCaptchaForNewsletter,

          // Difficulty
          recaptchaV3ScoreThreshold:
            DEFAULT_CAPTCHA_CONFIG.recaptchaV3ScoreThreshold,
          maxFailedAttempts: DEFAULT_CAPTCHA_CONFIG.maxFailedAttempts,
          lockoutDurationMinutes: DEFAULT_CAPTCHA_CONFIG.lockoutDurationMinutes,

          // Exemptions
          exemptAuthenticatedUsers:
            DEFAULT_CAPTCHA_CONFIG.exemptAuthenticatedUsers,
          exemptAdmins: DEFAULT_CAPTCHA_CONFIG.exemptAdmins,
          exemptedIps: DEFAULT_CAPTCHA_CONFIG.exemptedIps,

          // Theme
          theme: DEFAULT_CAPTCHA_CONFIG.theme,
          size: DEFAULT_CAPTCHA_CONFIG.size,
        },
      });
    }

    this.cached = row;
    return this.cached;
  }

  private async propagateConfig(
    settings: CaptchaSystemSettings,
  ): Promise<void> {
    const cfg: Required<CaptchaConfig> = {
      captchaEnabled: settings.captchaEnabled,
      captchaMode: settings.captchaMode as CaptchaMode,
      defaultProvider: settings.defaultProvider as CaptchaProviderType,
      enableFallbackChain: settings.enableFallbackChain,
      fallbackOrder: settings.fallbackOrder as CaptchaProviderType[],

      enableTurnstile: settings.enableTurnstile,
      enableRecaptchaV3: settings.enableRecaptchaV3,
      enableRecaptchaV2: settings.enableRecaptchaV2,
      enableHcaptcha: settings.enableHcaptcha,
      enableInhouse: settings.enableInhouse,

      turnstileSiteKey: settings.turnstileSiteKey,
      recaptchaV2SiteKey: settings.recaptchaV2SiteKey,
      recaptchaV3SiteKey: settings.recaptchaV3SiteKey,
      hcaptchaSiteKey: settings.hcaptchaSiteKey,

      inhouseCodeLength: settings.inhouseCodeLength,
      inhouseChallengeTtlMs: settings.inhouseChallengeTtlMs,
      inhouseMaxRetries: settings.inhouseMaxRetries,
      inhouseChallengeEndpoint: settings.inhouseChallengeEndpoint,

      scriptLoadTimeoutMs: settings.scriptLoadTimeoutMs,

      requireCaptchaForLogin: settings.requireCaptchaForLogin,
      requireCaptchaForRegistration: settings.requireCaptchaForRegistration,
      requireCaptchaForComments: settings.requireCaptchaForComments,
      requireCaptchaForContact: settings.requireCaptchaForContact,
      requireCaptchaForPasswordReset: settings.requireCaptchaForPasswordReset,
      requireCaptchaForNewsletter: settings.requireCaptchaForNewsletter,

      recaptchaV3ScoreThreshold: settings.recaptchaV3ScoreThreshold,
      maxFailedAttempts: settings.maxFailedAttempts,
      lockoutDurationMinutes: settings.lockoutDurationMinutes,

      exemptAuthenticatedUsers: settings.exemptAuthenticatedUsers,
      exemptAdmins: settings.exemptAdmins,
      exemptedIps: settings.exemptedIps,

      theme: settings.theme as "light" | "dark" | "auto",
      size: settings.size as "normal" | "compact",
    };

    for (const consumer of this.consumers) {
      try {
        consumer.updateConfig(cfg);
      } catch (err) {
        logger.error("Config propagation error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async countLockedOutIps(
    since: Date,
    settings: CaptchaSystemSettings,
  ): Promise<number> {
    if (settings.maxFailedAttempts <= 0) return 0;

    try {
      // Group failed attempts by IP and count those exceeding threshold
      const groups = await this.prisma.captchaAttempt.groupBy({
        by: ["clientIp"],
        where: {
          success: false,
          createdAt: { gte: since },
        },
        _count: true,
      });

      return (groups as { _count: number; clientIp: string }[]).filter(
        (g) => g._count >= settings.maxFailedAttempts,
      ).length;
    } catch {
      return 0;
    }
  }

  private async getProviderBreakdown(
    since: Date,
  ): Promise<
    Record<string, { attempts: number; successes: number; failures: number }>
  > {
    const breakdown: Record<
      string,
      { attempts: number; successes: number; failures: number }
    > = {};

    try {
      const groups = await this.prisma.captchaAttempt.groupBy({
        by: ["provider", "success"],
        where: { createdAt: { gte: since } },
        _count: true,
      });

      for (const g of groups as {
        provider: string;
        success: boolean;
        _count: number;
      }[]) {
        if (!breakdown[g.provider]) {
          breakdown[g.provider] = { attempts: 0, successes: 0, failures: 0 };
        }
        breakdown[g.provider].attempts += g._count;
        if (g.success) {
          breakdown[g.provider].successes += g._count;
        } else {
          breakdown[g.provider].failures += g._count;
        }
      }
    } catch {
      // CaptchaAttempt table may not exist yet
    }

    return breakdown;
  }
}
