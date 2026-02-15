// src/features/ads/server/constants.ts
import type { AdsConfig, WidgetAdConfig, ConcurrencyPolicy, AdSize } from "../types";

export const CACHE_PREFIX = "ads:";

export const CACHE_KEYS = {
  CONFIG: `${CACHE_PREFIX}config`,
  PROVIDERS: `${CACHE_PREFIX}providers`,
  SLOTS: `${CACHE_PREFIX}slots`,
  PLACEMENTS: `${CACHE_PREFIX}placements`,
  OVERVIEW: `${CACHE_PREFIX}overview`,
} as const;

export const ADS_LIMITS = {
  MAX_PROVIDERS: 50,
  MAX_SLOTS: 100,
  MAX_PLACEMENTS: 500,
  MAX_PER_PAGE: 20,
  NAME_MIN: 2,
  NAME_MAX: 120,
  SLUG_MAX: 150,
  DESCRIPTION_MAX: 500,
  AD_CODE_MAX: 50_000,
  CUSTOM_HTML_MAX: 100_000,
  CONTAINER_SELECTOR_MAX: 250,
} as const;

export const PROVIDER_SENSITIVE_FIELDS = ["apiKey", "config"] as const;

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  ADSENSE: "Google AdSense",
  AD_MANAGER: "Google Ad Manager",
  MEDIA_NET: "Media.net",
  AMAZON_APS: "Amazon APS",
  EZOIC: "Ezoic",
  RAPTIVE: "Raptive",
  MONUMETRIC: "Monumetric",
  PROPELLER_ADS: "PropellerAds",
  SOVRN: "Sovrn",
  OUTBRAIN: "Outbrain",
  CUSTOM: "Custom",
};

export const POSITION_LABELS: Record<string, string> = {
  HEADER: "Header", FOOTER: "Footer", SIDEBAR: "Sidebar",
  SIDEBAR_STICKY: "Sidebar (Sticky)", IN_CONTENT: "In Content",
  IN_ARTICLE: "In Article", IN_FEED: "In Feed",
  BETWEEN_POSTS: "Between Posts", AFTER_PARAGRAPH: "After Paragraph",
  BEFORE_COMMENTS: "Before Comments", AFTER_COMMENTS: "After Comments",
  WIDGET_TOP: "Widget Top", WIDGET_BOTTOM: "Widget Bottom",
  WIDGET_BETWEEN: "Widget Between", WIDGET_INSIDE: "Widget Inside",
  STICKY_TOP: "Sticky Top", STICKY_BOTTOM: "Sticky Bottom",
  INTERSTITIAL: "Interstitial", EXIT_INTENT: "Exit Intent",
  PARALLAX: "Parallax", IN_IMAGE: "In Image",
  NATIVE_RECOMMENDATION: "Native Recommendation", MATCHED_CONTENT: "Matched Content",
  VIDEO_PRE_ROLL: "Video Pre-Roll", VIDEO_MID_ROLL: "Video Mid-Roll",
  VIDEO_POST_ROLL: "Video Post-Roll", REWARDED: "Rewarded",
  FLOATING: "Floating", AUTO: "Auto",
};

export const FORMAT_LABELS: Record<string, string> = {
  DISPLAY: "Display", NATIVE: "Native", VIDEO: "Video",
  RICH_MEDIA: "Rich Media", TEXT: "Text", LINK_UNIT: "Link Unit",
  MATCHED_CONTENT: "Matched Content", IN_ARTICLE: "In-Article",
  IN_FEED: "In-Feed", INTERSTITIAL: "Interstitial",
  REWARDED: "Rewarded", ANCHOR: "Anchor", VIGNETTE: "Vignette",
  MULTIPLEX: "Multiplex",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  IMPRESSION: "Impression", CLICK: "Click", VIEWABLE: "Viewable",
  CLOSE: "Close", EXPAND: "Expand", COLLAPSE: "Collapse",
  VIDEO_START: "Video Start", VIDEO_COMPLETE: "Video Complete",
  MUTE: "Mute", UNMUTE: "Unmute",
};

export const STRATEGY_LABELS: Record<string, string> = {
  DENSITY_BASED: "Density Based", PARAGRAPH_COUNT: "Paragraph Count",
  CONTENT_AWARE: "Content Aware", VIEWPORT_BASED: "Viewport Based",
  ENGAGEMENT_BASED: "Engagement Based",
};

export const PROVIDER_DEFAULTS: Record<string, Record<string, unknown>> = {
  ADSENSE: { loadStrategy: "lazy", maxPerPage: 3, allowConcurrent: false },
  AD_MANAGER: { loadStrategy: "eager", maxPerPage: 10, allowConcurrent: true },
  CUSTOM: { loadStrategy: "lazy", maxPerPage: 5, allowConcurrent: true },
};

export const IAB_AD_SIZES: AdSize[] = [
  { width: 728, height: 90 }, { width: 300, height: 250 },
  { width: 336, height: 280 }, { width: 160, height: 600 },
  { width: 300, height: 600 }, { width: 970, height: 90 },
  { width: 970, height: 250 }, { width: 320, height: 50 },
  { width: 320, height: 100 }, { width: 300, height: 50 },
];

export const DEFAULT_WIDGET_AD_CONFIG: WidgetAdConfig = {
  widgetGap: 2,
  minWidgetsBefore: 1,
  maxPerArea: 3,
  targetSelectors: [".widget-area", ".sidebar-widget"],
  excludeBesideSelectors: [],
};

export const DEFAULT_CONCURRENCY_POLICY: ConcurrencyPolicy = {
  enabled: false,
  maxProvidersPerPage: 3,
  priorityResolution: "highest_wins",
  mutuallyExclusivePairs: [],
  adsenseMaxDisplay: 3,
  adsenseMaxLink: 3,
  maxNativeWidgets: 4,
};

export const DEFAULT_ADS_CONFIG: AdsConfig = {
  adsEnabled: false,
  positionKillSwitches: {},
  enableAutoPlacement: false,
  autoAdStrategy: "PARAGRAPH_COUNT",
  globalMaxAdsPerPage: 5,
  defaultMinParagraphs: 3,
  defaultParagraphGap: 4,
  minContentLength: 500,
  respectSectionBreaks: true,
  skipCodeBlocks: true,
  enableWidgetAds: false,
  widgetAdConfig: DEFAULT_WIDGET_AD_CONFIG,
  enableResponsive: true,
  breakpoints: { MOBILE: 0, TABLET: 768, DESKTOP: 1024, WIDESCREEN: 1440 },
  concurrencyPolicy: DEFAULT_CONCURRENCY_POLICY,
  enableAnalytics: true,
  enableComplianceScanning: false,
  cacheTtlSeconds: 300,
  sanitizeAdCode: true,
  lazyLoadAds: true,
  defaultLazyOffset: 200,
  enableAdRefresh: false,
  minRefreshInterval: 30,
  allowedProviderTypes: [],
  eventRateLimitWindowMs: 60_000,
  eventRateLimitMax: 50,
  maxViewportAdCoverage: 30,
  minAdSpacingPx: 250,
  deferUntilLcp: true,
  enableAdsTxt: false,
  adsTxtCustomEntries: [],
  requireConsent: false,
  consentModes: [],
};

export const DEFAULT_ADS_TXT = "# Auto-generated ads.txt\n";

export const TRUSTED_AD_SCRIPT_DOMAINS = [
  "pagead2.googlesyndication.com",
  "securepubads.g.doubleclick.net",
  "contextual.media.net",
  "c.amazon-adsystem.com",
  "cdn.ezoic.net",
];

export const ADS_CONFIG_PRESETS: Record<string, Partial<AdsConfig>> = {
  minimal: { globalMaxAdsPerPage: 2, enableAutoPlacement: false, enableWidgetAds: false },
  standard: { globalMaxAdsPerPage: 5, enableAutoPlacement: true, enableWidgetAds: true },
  aggressive: { globalMaxAdsPerPage: 10, enableAutoPlacement: true, enableWidgetAds: true },
};

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}
