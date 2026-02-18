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

/* ── Server ──────────────────────────────────────────────────────── */
export { AdsService } from "./server/ads.service";
export { AdsAdminSettingsService } from "./server/admin-settings.service";

export {
  adSizeSchema,
  responsiveSizeMapSchema,
  widgetAdConfigSchema,
  concurrencyPolicySchema,
  createProviderSchema,
  updateProviderSchema,
  createSlotSchema,
  updateSlotSchema,
  createPlacementSchema,
  updatePlacementSchema,
  recordEventSchema,
  updateAdsConfigSchema,
  pageQuerySchema,
} from "./server/schemas";

export { sanitizeAdCode, sanitizeCustomHtml, escapeHtml, escapeHtmlAttr, detectDangerousPatterns, findUntrustedScripts } from "./server/sanitization.util";
export type { DangerousMatch, UntrustedScript } from "./server/sanitization.util";

export {
  discoverPageTypes,
  removePageTypesFromSlots,
  addPageTypesToSlots,
  syncAdSlotPageTypes,
  generateScanHealthReport,
  STATIC_PAGE_TYPES,
} from "./server/scan-pages";
export type { ScannedPageType, ScanHealthReport } from "./server/scan-pages";

/* ── UI Components ───────────────────────────────────────────────── */
export { AdContainer } from "./ui/AdContainer";
export { AdRenderer } from "./ui/AdRenderer";
export { ReservedAdSlot } from "./ui/ReservedAdSlot";
export { StickyAd } from "./ui/StickyAd";
export { InterstitialAd } from "./ui/InterstitialAd";
export { FloatingAd } from "./ui/FloatingAd";
export { ExitIntentAd } from "./ui/ExitIntentAd";
export { VignetteAd } from "./ui/VignetteAd";
export { VideoAd } from "./ui/VideoAd";
export { InArticleAd } from "./ui/InArticleAd";
export { InFeedAdCard } from "./ui/InFeedAdCard";
export { NativeRecommendationAd } from "./ui/NativeRecommendationAd";
export { HeaderAdBanner, FooterAdBanner, OverlayAdSlots } from "./ui/GlobalAdSlots";
