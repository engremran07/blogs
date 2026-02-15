// pages/admin-settings.service.ts
// DB-backed dynamic page system settings — fully configurable from admin panel.
// All page behavior (locking, hierarchy, revisions, code injection, scheduling)
// is controlled at runtime through this service. Changes persist via PageSettings model.
// Framework-agnostic — zero external dependencies.

import type {
  PagesPrismaClient,
  PagesSystemSettings,
  PagesConfig,
  PagesConfigConsumer,
} from '../types';
import { PAGES_DEFAULTS } from './constants';

/* ========================================================================== */
/*  SERVICE                                                                   */
/* ========================================================================== */

export class PagesAdminSettingsService {
  /** Cached settings — loaded once, updated on write. */
  private cached: PagesSystemSettings | null = null;

  /** Registered services that need config propagation. */
  private consumers: PagesConfigConsumer[] = [];

  constructor(
    private readonly prisma: PagesPrismaClient,
  ) {}

  /* ======================================================================== */
  /*  CONSUMER REGISTRATION                                                   */
  /* ======================================================================== */

  /**
   * Register a service that should receive config updates when admin changes settings.
   * Typically called during app bootstrap:
   *   pagesAdmin.registerConsumer(pageService);
   */
  registerConsumer(consumer: PagesConfigConsumer): void {
    if (!this.consumers.includes(consumer)) {
      this.consumers.push(consumer);
    }
  }

  /* ======================================================================== */
  /*  READ SETTINGS                                                           */
  /* ======================================================================== */

  /**
   * Get current page system settings.
   * Uses cache if available; loads/creates from DB on first call.
   */
  async getSettings(): Promise<PagesSystemSettings> {
    if (this.cached) return this.cached;
    return this.loadFromDb();
  }

  /**
   * Build a PagesConfig from persisted settings.
   * Consumers (PageService) use this to get runtime config.
   */
  async getConfig(): Promise<Required<PagesConfig>> {
    const s = await this.getSettings();
    return this.settingsToConfig(s);
  }

  /**
   * Get safe subset of settings for frontend/public display.
   * Excludes internal-only config that shouldn't be exposed.
   */
  async getFrontendSettings(): Promise<Record<string, unknown>> {
    const s = await this.getSettings();
    return {
      pagesPerPage: s.pagesPerPage,
      enableHierarchy: s.enableHierarchy,
      enablePasswordProtection: s.enablePasswordProtection,
      defaultTemplate: s.defaultTemplate,
      defaultVisibility: s.defaultVisibility,
    };
  }

  /* ======================================================================== */
  /*  UPDATE SETTINGS                                                         */
  /* ======================================================================== */

  /**
   * Update page system settings from admin panel.
   * Merges partial payload with existing values, persists to DB,
   * and propagates changes to all registered consumers.
   */
  async updateSettings(
    payload: Partial<PagesConfig>,
    updatedBy: string,
  ): Promise<PagesSystemSettings> {
    const current = await this.getSettings();

    const data: Record<string, unknown> = {
      updatedBy,
      updatedAt: new Date(),
    };

    // Merge each configurable field
    if (payload.pagesPerPage !== undefined) data.pagesPerPage = payload.pagesPerPage;
    if (payload.minWordCount !== undefined) data.minWordCount = payload.minWordCount;
    if (payload.readingSpeedWpm !== undefined) data.readingSpeedWpm = payload.readingSpeedWpm;
    if (payload.pagesBaseUrl !== undefined) data.pagesBaseUrl = payload.pagesBaseUrl;
    if (payload.excerptLength !== undefined) data.excerptLength = payload.excerptLength;
    if (payload.lockTimeoutMinutes !== undefined) data.lockTimeoutMinutes = payload.lockTimeoutMinutes;
    if (payload.maxRevisionsPerPage !== undefined) data.maxRevisionsPerPage = payload.maxRevisionsPerPage;
    if (payload.maxDepth !== undefined) data.maxDepth = payload.maxDepth;
    if (payload.allowCodeInjection !== undefined) data.allowCodeInjection = payload.allowCodeInjection;
    if (payload.enableRevisions !== undefined) data.enableRevisions = payload.enableRevisions;
    if (payload.enableLocking !== undefined) data.enableLocking = payload.enableLocking;
    if (payload.enableScheduling !== undefined) data.enableScheduling = payload.enableScheduling;
    if (payload.enableHierarchy !== undefined) data.enableHierarchy = payload.enableHierarchy;
    if (payload.enablePasswordProtection !== undefined) data.enablePasswordProtection = payload.enablePasswordProtection;
    if (payload.autoRegisterSystemPages !== undefined) data.autoRegisterSystemPages = payload.autoRegisterSystemPages;
    if (payload.defaultTemplate !== undefined) data.defaultTemplate = payload.defaultTemplate;
    if (payload.defaultVisibility !== undefined) data.defaultVisibility = payload.defaultVisibility;
    if (payload.defaultStatus !== undefined) data.defaultStatus = payload.defaultStatus;

    const updated = await this.prisma.pageSettings.update({
      where: { id: current.id },
      data,
    });

    this.cached = updated as PagesSystemSettings;

    // Propagate to all registered consumers
    await this.propagateConfig();

    return this.cached;
  }

  /**
   * Reset all settings to defaults.
   */
  async resetToDefaults(updatedBy: string): Promise<PagesSystemSettings> {
    const current = await this.getSettings();

    const data: Record<string, unknown> = {
      ...PAGES_DEFAULTS,
      updatedBy,
      updatedAt: new Date(),
    };

    const updated = await this.prisma.pageSettings.update({
      where: { id: current.id },
      data,
    });

    this.cached = updated as PagesSystemSettings;
    await this.propagateConfig();
    return this.cached;
  }

  /* ======================================================================== */
  /*  PRIVATE                                                                 */
  /* ======================================================================== */

  /** Load settings from DB or create with defaults if none exist. */
  private async loadFromDb(): Promise<PagesSystemSettings> {
    const existing = await this.prisma.pageSettings.findFirst();

    if (existing) {
      this.cached = existing as PagesSystemSettings;
      return this.cached;
    }

    // First run — seed defaults
    const created = await this.prisma.pageSettings.create({
      data: {
        pagesPerPage: PAGES_DEFAULTS.pagesPerPage,
        minWordCount: PAGES_DEFAULTS.minWordCount,
        readingSpeedWpm: PAGES_DEFAULTS.readingSpeedWpm,
        pagesBaseUrl: PAGES_DEFAULTS.pagesBaseUrl,
        excerptLength: PAGES_DEFAULTS.excerptLength,
        lockTimeoutMinutes: PAGES_DEFAULTS.lockTimeoutMinutes,
        maxRevisionsPerPage: PAGES_DEFAULTS.maxRevisionsPerPage,
        maxDepth: PAGES_DEFAULTS.maxDepth,
        allowCodeInjection: PAGES_DEFAULTS.allowCodeInjection,
        enableRevisions: PAGES_DEFAULTS.enableRevisions,
        enableLocking: PAGES_DEFAULTS.enableLocking,
        enableScheduling: PAGES_DEFAULTS.enableScheduling,
        enableHierarchy: PAGES_DEFAULTS.enableHierarchy,
        enablePasswordProtection: PAGES_DEFAULTS.enablePasswordProtection,
        autoRegisterSystemPages: PAGES_DEFAULTS.autoRegisterSystemPages,
        defaultTemplate: PAGES_DEFAULTS.defaultTemplate,
        defaultVisibility: PAGES_DEFAULTS.defaultVisibility,
        defaultStatus: PAGES_DEFAULTS.defaultStatus,
        updatedBy: null,
      },
    });

    this.cached = created as PagesSystemSettings;
    return this.cached;
  }

  /** Convert DB settings to PagesConfig for consumers. */
  private settingsToConfig(s: PagesSystemSettings): Required<PagesConfig> {
    return {
      pagesPerPage: s.pagesPerPage,
      minWordCount: s.minWordCount,
      readingSpeedWpm: s.readingSpeedWpm,
      pagesBaseUrl: s.pagesBaseUrl,
      excerptLength: s.excerptLength,
      lockTimeoutMinutes: s.lockTimeoutMinutes,
      maxRevisionsPerPage: s.maxRevisionsPerPage,
      maxDepth: s.maxDepth,
      allowCodeInjection: s.allowCodeInjection,
      enableRevisions: s.enableRevisions,
      enableLocking: s.enableLocking,
      enableScheduling: s.enableScheduling,
      enableHierarchy: s.enableHierarchy,
      enablePasswordProtection: s.enablePasswordProtection,
      autoRegisterSystemPages: s.autoRegisterSystemPages,
      defaultTemplate: s.defaultTemplate as Required<PagesConfig>['defaultTemplate'],
      defaultVisibility: s.defaultVisibility as Required<PagesConfig>['defaultVisibility'],
      defaultStatus: s.defaultStatus as Required<PagesConfig>['defaultStatus'],
    };
  }

  /** Propagate current config to all registered consumers. */
  private async propagateConfig(): Promise<void> {
    const config = await this.getConfig();
    for (const consumer of this.consumers) {
      try {
        consumer.updateConfig(config);
      } catch {
        // Consumer update failed — non-fatal
      }
    }
  }
}
