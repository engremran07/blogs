// src/features/ads/server/admin-settings.service.ts
import type { AdsConfig, AdsPrismaClient, CacheProvider } from "../types";
import { DEFAULT_ADS_CONFIG, CACHE_KEYS } from "./constants";

export interface AdsAdminSettingsDeps {
  prisma: AdsPrismaClient;
  cache: CacheProvider;
}

export class AdsAdminSettingsService {
  private prisma: AdsPrismaClient;
  private cache: CacheProvider;

  constructor(deps: AdsAdminSettingsDeps) {
    this.prisma = deps.prisma;
    this.cache = deps.cache;
  }

  async getConfig(): Promise<AdsConfig> {
    const cached = await this.cache.get<AdsConfig>(CACHE_KEYS.CONFIG);
    if (cached) return cached;

    const row = await this.prisma.adSettings.findFirst();
    if (!row) return { ...DEFAULT_ADS_CONFIG };

    const config: AdsConfig = {
      adsEnabled: row.adsEnabled ?? DEFAULT_ADS_CONFIG.adsEnabled,
      positionKillSwitches: (row.positionKillSwitches as Record<string, boolean>) ?? {},
      enableAutoPlacement: row.enableAutoPlacement ?? DEFAULT_ADS_CONFIG.enableAutoPlacement,
      autoAdStrategy: (row.autoAdStrategy as AdsConfig["autoAdStrategy"]) ?? DEFAULT_ADS_CONFIG.autoAdStrategy,
      globalMaxAdsPerPage: row.globalMaxAdsPerPage ?? DEFAULT_ADS_CONFIG.globalMaxAdsPerPage,
      defaultMinParagraphs: row.defaultMinParagraphs ?? DEFAULT_ADS_CONFIG.defaultMinParagraphs,
      defaultParagraphGap: row.defaultParagraphGap ?? DEFAULT_ADS_CONFIG.defaultParagraphGap,
      minContentLength: row.minContentLength ?? DEFAULT_ADS_CONFIG.minContentLength,
      respectSectionBreaks: row.respectSectionBreaks ?? DEFAULT_ADS_CONFIG.respectSectionBreaks,
      skipCodeBlocks: row.skipCodeBlocks ?? DEFAULT_ADS_CONFIG.skipCodeBlocks,
      enableWidgetAds: row.enableWidgetAds ?? DEFAULT_ADS_CONFIG.enableWidgetAds,
      widgetAdConfig: (row.widgetAdConfig as AdsConfig["widgetAdConfig"]) ?? DEFAULT_ADS_CONFIG.widgetAdConfig,
      enableResponsive: row.enableResponsive ?? DEFAULT_ADS_CONFIG.enableResponsive,
      breakpoints: (row.breakpoints as AdsConfig["breakpoints"]) ?? DEFAULT_ADS_CONFIG.breakpoints,
      concurrencyPolicy: (row.concurrencyPolicy as AdsConfig["concurrencyPolicy"]) ?? DEFAULT_ADS_CONFIG.concurrencyPolicy,
      enableAnalytics: row.enableAnalytics ?? DEFAULT_ADS_CONFIG.enableAnalytics,
      enableComplianceScanning: row.enableComplianceScanning ?? DEFAULT_ADS_CONFIG.enableComplianceScanning,
      cacheTtlSeconds: row.cacheTtlSeconds ?? DEFAULT_ADS_CONFIG.cacheTtlSeconds,
      sanitizeAdCode: row.sanitizeAdCode ?? DEFAULT_ADS_CONFIG.sanitizeAdCode,
      lazyLoadAds: row.lazyLoadAds ?? DEFAULT_ADS_CONFIG.lazyLoadAds,
      defaultLazyOffset: row.defaultLazyOffset ?? DEFAULT_ADS_CONFIG.defaultLazyOffset,
      enableAdRefresh: row.enableAdRefresh ?? DEFAULT_ADS_CONFIG.enableAdRefresh,
      minRefreshInterval: row.minRefreshInterval ?? DEFAULT_ADS_CONFIG.minRefreshInterval,
      allowedProviderTypes: (row.allowedProviderTypes as AdsConfig["allowedProviderTypes"]) ?? DEFAULT_ADS_CONFIG.allowedProviderTypes,
      eventRateLimitWindowMs: row.eventRateLimitWindowMs ?? DEFAULT_ADS_CONFIG.eventRateLimitWindowMs,
      eventRateLimitMax: row.eventRateLimitMax ?? DEFAULT_ADS_CONFIG.eventRateLimitMax,
      maxViewportAdCoverage: row.maxViewportAdCoverage ?? DEFAULT_ADS_CONFIG.maxViewportAdCoverage,
      minAdSpacingPx: row.minAdSpacingPx ?? DEFAULT_ADS_CONFIG.minAdSpacingPx,
      deferUntilLcp: row.deferUntilLcp ?? DEFAULT_ADS_CONFIG.deferUntilLcp,
      enableAdsTxt: row.enableAdsTxt ?? DEFAULT_ADS_CONFIG.enableAdsTxt,
      adsTxtCustomEntries: (row.adsTxtCustomEntries as string[]) ?? DEFAULT_ADS_CONFIG.adsTxtCustomEntries,
      requireConsent: row.requireConsent ?? DEFAULT_ADS_CONFIG.requireConsent,
      consentModes: (row.consentModes as string[]) ?? DEFAULT_ADS_CONFIG.consentModes,
    };

    await this.cache.set(CACHE_KEYS.CONFIG, config, 300);
    return config;
  }

  async updateConfig(input: Partial<AdsConfig>): Promise<AdsConfig> {
    const existing = await this.prisma.adSettings.findFirst();

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          data[key] = value;
        } else {
          data[key] = value;
        }
      }
    }

    if (existing) {
      await this.prisma.adSettings.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.adSettings.create({ data });
    }

    await this.cache.invalidatePrefix("ads:");
    return this.getConfig();
  }
}
