// src/features/ads/server/admin-settings.service.ts
import type { AdsConfig, AdsPrismaClient, CacheProvider } from "../types";
import { DEFAULT_ADS_CONFIG, CACHE_KEYS } from "./constants";

export interface AdsAdminSettingsDeps {
  prisma: AdsPrismaClient;
  cache: CacheProvider;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeWidgetAdConfig(value: unknown): AdsConfig["widgetAdConfig"] {
  const defaults = DEFAULT_ADS_CONFIG.widgetAdConfig;
  const record = asRecord(value);
  if (!record) return defaults;

  return {
    widgetGap:
      typeof record.widgetGap === "number"
        ? record.widgetGap
        : defaults.widgetGap,
    minWidgetsBefore:
      typeof record.minWidgetsBefore === "number"
        ? record.minWidgetsBefore
        : defaults.minWidgetsBefore,
    maxPerArea:
      typeof record.maxPerArea === "number"
        ? record.maxPerArea
        : defaults.maxPerArea,
    targetSelectors: Array.isArray(record.targetSelectors)
      ? record.targetSelectors.filter(
          (item): item is string => typeof item === "string",
        )
      : defaults.targetSelectors,
    excludeBesideSelectors: Array.isArray(record.excludeBesideSelectors)
      ? record.excludeBesideSelectors.filter(
          (item): item is string => typeof item === "string",
        )
      : defaults.excludeBesideSelectors,
  };
}

function isPriorityResolution(
  value: unknown,
): value is AdsConfig["concurrencyPolicy"]["priorityResolution"] {
  return (
    value === "highest_wins" || value === "round_robin" || value === "random"
  );
}

function isAdProviderType(
  value: unknown,
): value is AdsConfig["allowedProviderTypes"][number] {
  return (
    typeof value === "string" &&
    DEFAULT_ADS_CONFIG.allowedProviderTypes.includes(
      value as AdsConfig["allowedProviderTypes"][number],
    )
  );
}

function normalizeConcurrencyPolicy(
  value: unknown,
): AdsConfig["concurrencyPolicy"] {
  const defaults = DEFAULT_ADS_CONFIG.concurrencyPolicy;
  const record = asRecord(value);
  if (!record) return defaults;

  const pairs = Array.isArray(record.mutuallyExclusivePairs)
    ? record.mutuallyExclusivePairs
        .map((pair) => {
          if (
            Array.isArray(pair) &&
            pair.length === 2 &&
            isAdProviderType(pair[0]) &&
            isAdProviderType(pair[1])
          ) {
            return [pair[0], pair[1]] as [
              AdsConfig["allowedProviderTypes"][number],
              AdsConfig["allowedProviderTypes"][number],
            ];
          }
          return null;
        })
        .filter(
          (
            pair,
          ): pair is [
            AdsConfig["allowedProviderTypes"][number],
            AdsConfig["allowedProviderTypes"][number],
          ] => pair !== null,
        )
    : defaults.mutuallyExclusivePairs;

  return {
    enabled:
      typeof record.enabled === "boolean" ? record.enabled : defaults.enabled,
    maxProvidersPerPage:
      typeof record.maxProvidersPerPage === "number"
        ? record.maxProvidersPerPage
        : defaults.maxProvidersPerPage,
    priorityResolution: isPriorityResolution(record.priorityResolution)
      ? record.priorityResolution
      : defaults.priorityResolution,
    mutuallyExclusivePairs: pairs,
    adsenseMaxDisplay:
      typeof record.adsenseMaxDisplay === "number"
        ? record.adsenseMaxDisplay
        : defaults.adsenseMaxDisplay,
    adsenseMaxLink:
      typeof record.adsenseMaxLink === "number"
        ? record.adsenseMaxLink
        : defaults.adsenseMaxLink,
    maxNativeWidgets:
      typeof record.maxNativeWidgets === "number"
        ? record.maxNativeWidgets
        : defaults.maxNativeWidgets,
  };
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
      positionKillSwitches:
        (row.positionKillSwitches as Record<string, boolean>) ?? {},
      enableAutoPlacement:
        row.enableAutoPlacement ?? DEFAULT_ADS_CONFIG.enableAutoPlacement,
      autoAdStrategy:
        (row.autoAdStrategy as AdsConfig["autoAdStrategy"]) ??
        DEFAULT_ADS_CONFIG.autoAdStrategy,
      globalMaxAdsPerPage:
        row.globalMaxAdsPerPage ?? DEFAULT_ADS_CONFIG.globalMaxAdsPerPage,
      defaultMinParagraphs:
        row.defaultMinParagraphs ?? DEFAULT_ADS_CONFIG.defaultMinParagraphs,
      defaultParagraphGap:
        row.defaultParagraphGap ?? DEFAULT_ADS_CONFIG.defaultParagraphGap,
      minContentLength:
        row.minContentLength ?? DEFAULT_ADS_CONFIG.minContentLength,
      respectSectionBreaks:
        row.respectSectionBreaks ?? DEFAULT_ADS_CONFIG.respectSectionBreaks,
      skipCodeBlocks: row.skipCodeBlocks ?? DEFAULT_ADS_CONFIG.skipCodeBlocks,
      enableWidgetAds:
        row.enableWidgetAds ?? DEFAULT_ADS_CONFIG.enableWidgetAds,
      widgetAdConfig: normalizeWidgetAdConfig(row.widgetAdConfig),
      enableResponsive:
        row.enableResponsive ?? DEFAULT_ADS_CONFIG.enableResponsive,
      breakpoints:
        (row.breakpoints as AdsConfig["breakpoints"]) ??
        DEFAULT_ADS_CONFIG.breakpoints,
      concurrencyPolicy: normalizeConcurrencyPolicy(row.concurrencyPolicy),
      enableAnalytics:
        row.enableAnalytics ?? DEFAULT_ADS_CONFIG.enableAnalytics,
      enableComplianceScanning:
        row.enableComplianceScanning ??
        DEFAULT_ADS_CONFIG.enableComplianceScanning,
      cacheTtlSeconds:
        row.cacheTtlSeconds ?? DEFAULT_ADS_CONFIG.cacheTtlSeconds,
      sanitizeAdCode: row.sanitizeAdCode ?? DEFAULT_ADS_CONFIG.sanitizeAdCode,
      lazyLoadAds: row.lazyLoadAds ?? DEFAULT_ADS_CONFIG.lazyLoadAds,
      defaultLazyOffset:
        row.defaultLazyOffset ?? DEFAULT_ADS_CONFIG.defaultLazyOffset,
      enableAdRefresh:
        row.enableAdRefresh ?? DEFAULT_ADS_CONFIG.enableAdRefresh,
      minRefreshInterval:
        row.minRefreshInterval ?? DEFAULT_ADS_CONFIG.minRefreshInterval,
      allowedProviderTypes:
        (row.allowedProviderTypes as AdsConfig["allowedProviderTypes"]) ??
        DEFAULT_ADS_CONFIG.allowedProviderTypes,
      eventRateLimitWindowMs:
        row.eventRateLimitWindowMs ?? DEFAULT_ADS_CONFIG.eventRateLimitWindowMs,
      eventRateLimitMax:
        row.eventRateLimitMax ?? DEFAULT_ADS_CONFIG.eventRateLimitMax,
      maxViewportAdCoverage:
        row.maxViewportAdCoverage ?? DEFAULT_ADS_CONFIG.maxViewportAdCoverage,
      minAdSpacingPx: row.minAdSpacingPx ?? DEFAULT_ADS_CONFIG.minAdSpacingPx,
      deferUntilLcp: row.deferUntilLcp ?? DEFAULT_ADS_CONFIG.deferUntilLcp,
      enableAdsTxt: row.enableAdsTxt ?? DEFAULT_ADS_CONFIG.enableAdsTxt,
      adsTxtCustomEntries:
        (row.adsTxtCustomEntries as string[]) ??
        DEFAULT_ADS_CONFIG.adsTxtCustomEntries,
      requireConsent: row.requireConsent ?? DEFAULT_ADS_CONFIG.requireConsent,
      consentModes:
        (row.consentModes as string[]) ?? DEFAULT_ADS_CONFIG.consentModes,
    };

    await this.cache.set(CACHE_KEYS.CONFIG, config, config.cacheTtlSeconds);
    return config;
  }

  async updateConfig(input: Partial<AdsConfig>): Promise<AdsConfig> {
    const existing = await this.prisma.adSettings.findFirst();

    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
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
