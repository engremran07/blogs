// src/features/ads/index.ts
// Barrel exports for the Ads feature module.

/* ── Types ───────────────────────────────────────────────────────── */
export type {
  AdProviderType,
  AdProvider,
  AdProviderWithCount,
  SafeAdProvider,
  AdPosition,
  AdFormat,
  AdSlot,
  AdSlotWithCount,
  AdPlacement,
  AdPlacementDetail,
  PublicPlacement,
  AdsConfig,
  WidgetAdConfig,
  ConcurrencyPolicy,
  ResponsiveBreakpoint,
  AdSize,
  ResponsiveSizeMap,
  AdsTxtEntry,
  AdEventType,
  AutoAdStrategy,
  AdsOverviewStats,
  PlacementStats,
  ComplianceScanResult,
  AdsPrismaClient,
  CacheProvider,
  AiComplianceProvider,
} from "./types";

export {
  AD_PROVIDER_TYPES,
  AD_POSITIONS,
  AD_FORMATS,
  AD_EVENT_TYPES,
  AUTO_AD_STRATEGIES,
  RESPONSIVE_BREAKPOINTS,
  AdsError,
} from "./types";
