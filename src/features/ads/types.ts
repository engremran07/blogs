// src/features/ads/types.ts
// Complete type system for an enterprise-grade Ads Management module.
// Covers: Top-10 providers, widget/auto/responsive ads, concurrency, kill switches.

/* ========================================================================== */
/*  PROVIDER TYPES — Top 10 Ad Networks                                       */
/* ========================================================================== */

export const AD_PROVIDER_TYPES = [
  'ADSENSE',        // Google AdSense — display, in-feed, in-article, matched content
  'AD_MANAGER',     // Google Ad Manager (DFP) — header bidding, programmatic
  'MEDIA_NET',      // Media.net (Yahoo/Bing contextual)
  'AMAZON_APS',     // Amazon Publisher Services (TAM/UAM header bidding)
  'EZOIC',          // Ezoic — AI-optimized ad placements
  'RAPTIVE',        // Raptive (formerly AdThrive) — premium display
  'MONUMETRIC',     // Monumetric — tiered ad management
  'PROPELLER_ADS',  // PropellerAds — push, native, interstitial, popunder
  'SOVRN',          // Sovrn — programmatic, header bidding
  'OUTBRAIN',       // Outbrain/Taboola — native content recommendation
  'CUSTOM',         // Custom / Direct-sold campaigns
] as const;

export type AdProviderType = (typeof AD_PROVIDER_TYPES)[number];

/* ========================================================================== */
/*  POSITION & PLACEMENT TYPES                                                */
/* ========================================================================== */

export const AD_POSITIONS = [
  'HEADER', 'FOOTER', 'SIDEBAR', 'SIDEBAR_STICKY',
  'IN_CONTENT', 'IN_ARTICLE', 'IN_FEED', 'BETWEEN_POSTS',
  'AFTER_PARAGRAPH', 'BEFORE_COMMENTS', 'AFTER_COMMENTS',
  'WIDGET_TOP', 'WIDGET_BOTTOM', 'WIDGET_BETWEEN', 'WIDGET_INSIDE',
  'STICKY_TOP', 'STICKY_BOTTOM', 'INTERSTITIAL', 'EXIT_INTENT',
  'PARALLAX', 'IN_IMAGE', 'NATIVE_RECOMMENDATION', 'MATCHED_CONTENT',
  'VIDEO_PRE_ROLL', 'VIDEO_MID_ROLL', 'VIDEO_POST_ROLL',
  'REWARDED', 'FLOATING',
  'AUTO',
] as const;

export type AdPosition = (typeof AD_POSITIONS)[number];

/* ========================================================================== */
/*  AD FORMATS                                                                */
/* ========================================================================== */

export const AD_FORMATS = [
  'DISPLAY', 'NATIVE', 'VIDEO', 'RICH_MEDIA', 'TEXT', 'LINK_UNIT',
  'MATCHED_CONTENT', 'IN_ARTICLE', 'IN_FEED', 'INTERSTITIAL',
  'REWARDED', 'ANCHOR', 'VIGNETTE', 'MULTIPLEX',
] as const;

export type AdFormat = (typeof AD_FORMATS)[number];

/* ========================================================================== */
/*  AUTO-ADS STRATEGY                                                         */
/* ========================================================================== */

export const AUTO_AD_STRATEGIES = [
  'DENSITY_BASED', 'PARAGRAPH_COUNT', 'CONTENT_AWARE',
  'VIEWPORT_BASED', 'ENGAGEMENT_BASED',
] as const;

export type AutoAdStrategy = (typeof AUTO_AD_STRATEGIES)[number];

/* ========================================================================== */
/*  EVENTS                                                                    */
/* ========================================================================== */

export const AD_EVENT_TYPES = [
  'IMPRESSION', 'CLICK', 'VIEWABLE', 'CLOSE',
  'EXPAND', 'COLLAPSE', 'VIDEO_START', 'VIDEO_COMPLETE',
  'MUTE', 'UNMUTE',
] as const;

export type AdEventType = (typeof AD_EVENT_TYPES)[number];

/* ========================================================================== */
/*  RESPONSIVE BREAKPOINTS                                                    */
/* ========================================================================== */

export const RESPONSIVE_BREAKPOINTS = [
  'MOBILE', 'TABLET', 'DESKTOP', 'WIDESCREEN',
] as const;

export type ResponsiveBreakpoint = (typeof RESPONSIVE_BREAKPOINTS)[number];

/* ========================================================================== */
/*  SIZE MAP                                                                  */
/* ========================================================================== */

export interface AdSize { width: number; height: number }

export type ResponsiveSizeMap = Partial<
  Record<
    ResponsiveBreakpoint,
    { preferred: AdSize; alternatives?: AdSize[]; hidden?: boolean }
  >
>;

/* ========================================================================== */
/*  ENTITY TYPES                                                              */
/* ========================================================================== */

export interface AdProvider {
  id: string;
  name: string;
  slug: string;
  type: AdProviderType;
  isActive: boolean;
  priority: number;
  clientId: string | null;
  publisherId: string | null;
  apiKey: string | null;
  scriptUrl: string | null;
  dataAttributes: Record<string, string>;
  config: Record<string, unknown> | null;
  killSwitch: boolean;
  supportedFormats: AdFormat[];
  allowConcurrent: boolean;
  exclusiveWith: string[];
  maxPerPage: number;
  loadStrategy: 'eager' | 'lazy' | 'intersection' | 'idle';
  createdAt: Date;
  updatedAt: Date;
}

export interface AdSlot {
  id: string;
  name: string;
  slug: string;
  position: AdPosition;
  format: AdFormat;
  description: string | null;
  responsiveSizes: ResponsiveSizeMap;
  maxWidth: number | null;
  maxHeight: number | null;
  responsive: boolean;
  containerSelector: string | null;
  pageTypes: string[];
  categories: string[];
  excludePages: string[];
  excludeSelectors: string[];
  isActive: boolean;
  multiProvider: boolean;
  renderPriority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdPlacement {
  id: string;
  providerId: string;
  slotId: string;
  adUnitId: string | null;
  adCode: string | null;
  customHtml: string | null;
  autoResize: boolean;
  minContainerWidth: number;
  maxContainerWidth: number;
  visibleBreakpoints: ResponsiveBreakpoint[];
  autoPlace: boolean;
  autoStrategy: AutoAdStrategy;
  minParagraphs: number;
  paragraphGap: number;
  maxAdsPerPage: number;
  lazyOffset: number;
  refreshIntervalSec: number;
  closeable: boolean;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  impressions: number;
  clicks: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdLog {
  id: string;
  placementId: string;
  eventType: AdEventType;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/* ========================================================================== */
/*  WIDGET AD TYPES                                                           */
/* ========================================================================== */

export interface WidgetAdConfig {
  widgetGap: number;
  minWidgetsBefore: number;
  maxPerArea: number;
  targetSelectors: string[];
  excludeBesideSelectors: string[];
}

/* ========================================================================== */
/*  CONCURRENCY & POLICY RULES                                                */
/* ========================================================================== */

export interface ConcurrencyPolicy {
  enabled: boolean;
  maxProvidersPerPage: number;
  priorityResolution: 'highest_wins' | 'round_robin' | 'random';
  mutuallyExclusivePairs: Array<[AdProviderType, AdProviderType]>;
  adsenseMaxDisplay: number;
  adsenseMaxLink: number;
  maxNativeWidgets: number;
}

/* ========================================================================== */
/*  PROJECTIONS                                                               */
/* ========================================================================== */

export type SafeAdProvider = Omit<AdProvider, 'apiKey' | 'config'>;

export interface AdProviderWithCount extends AdProvider { _count: { placements: number } }
export interface AdSlotWithCount extends AdSlot { _count: { placements: number } }
export interface AdPlacementDetail extends AdPlacement {
  provider: Pick<AdProvider, 'name' | 'type'>;
  slot: Pick<AdSlot, 'name' | 'position' | 'format'>;
}

/* ========================================================================== */
/*  CONFIGURATION                                                             */
/* ========================================================================== */

export interface AdsConfig {
  positionKillSwitches: Partial<Record<AdPosition, boolean>>;
  enableAutoPlacement: boolean;
  autoAdStrategy: AutoAdStrategy;
  globalMaxAdsPerPage: number;
  defaultMinParagraphs: number;
  defaultParagraphGap: number;
  minContentLength: number;
  respectSectionBreaks: boolean;
  skipCodeBlocks: boolean;
  enableWidgetAds: boolean;
  widgetAdConfig: WidgetAdConfig;
  enableResponsive: boolean;
  breakpoints: Record<ResponsiveBreakpoint, number>;
  concurrencyPolicy: ConcurrencyPolicy;
  enableAnalytics: boolean;
  enableComplianceScanning: boolean;
  cacheTtlSeconds: number;
  sanitizeAdCode: boolean;
  lazyLoadAds: boolean;
  defaultLazyOffset: number;
  enableAdRefresh: boolean;
  minRefreshInterval: number;
  allowedProviderTypes: AdProviderType[];
  eventRateLimitWindowMs: number;
  eventRateLimitMax: number;
  maxViewportAdCoverage: number;
  minAdSpacingPx: number;
  deferUntilLcp: boolean;
  enableAdsTxt: boolean;
  adsTxtCustomEntries: string[];
  requireConsent: boolean;
  consentModes: string[];
}

export interface AdsSettingsRow extends AdsConfig { id: string; updatedAt?: Date }

/* ========================================================================== */
/*  STATS                                                                     */
/* ========================================================================== */

export interface AdsOverviewStats {
  totalProviders: number;
  totalSlots: number;
  totalPlacements: number;
  activeProviders: number;
  activeSlots: number;
  activePlacements: number;
  totalImpressions: number;
  totalClicks: number;
  totalRevenue: number;
  ctr: number;
  rpm: number;
  byProvider: Array<{ type: AdProviderType; name: string; impressions: number; clicks: number; ctr: number }>;
  byPosition: Array<{ position: AdPosition; impressions: number; clicks: number; ctr: number }>;
}

export interface PlacementStats {
  impressions: number;
  clicks: number;
  viewable: number;
  closes: number;
  ctr: number;
  viewabilityRate: number;
  revenue: number;
}

/* ========================================================================== */
/*  COMPLIANCE & ADS.TXT                                                      */
/* ========================================================================== */

export interface ComplianceScanResult { scannedCount: number; passedCount: number; issues: ComplianceIssue[] }
export interface ComplianceIssue { placementId: string; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; rule: string }
export interface AdsTxtEntry { domain: string; publisherId: string; relation: 'DIRECT' | 'RESELLER'; certAuthorityId?: string }

/* ========================================================================== */
/*  ERROR HANDLING                                                            */
/* ========================================================================== */

export const ADS_ERROR_CODES = [
  'PROVIDER_NOT_FOUND', 'SLOT_NOT_FOUND', 'PLACEMENT_NOT_FOUND',
  'DUPLICATE_SLUG', 'INVALID_DATE_RANGE', 'INVALID_PROVIDER_TYPE',
  'INVALID_POSITION', 'INVALID_FORMAT', 'ADS_DISABLED', 'POSITION_DISABLED',
  'RATE_LIMITED', 'COMPLIANCE_SCAN_FAILED', 'SANITIZATION_FAILED',
  'INVALID_CONFIG', 'PROVIDER_TYPE_NOT_ALLOWED', 'PROVIDER_HAS_PLACEMENTS',
  'SLOT_HAS_PLACEMENTS', 'CONCURRENCY_VIOLATION', 'PROVIDER_KILLED',
  'CONSENT_REQUIRED', 'CONTENT_TOO_SHORT',
] as const;

export type AdsErrorCode = (typeof ADS_ERROR_CODES)[number];

export class AdsError extends Error {
  public readonly name = 'AdsError';
  constructor(
    message: string,
    public readonly code: AdsErrorCode,
    public readonly statusCode: number = 400,
  ) { super(message); }
}

/* ========================================================================== */
/*  DI INTERFACES                                                             */
/* ========================================================================== */

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  invalidatePrefix(prefix: string): Promise<void>;
}

/* ── Lightweight DB-record shapes (mirroring Prisma models) ──────────────── */

export interface AdProviderRecord {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  priority: number;
  clientId: string | null;
  publisherId: string | null;
  apiKey: string | null;
  scriptUrl: string | null;
  dataAttributes: Record<string, unknown>;
  config: Record<string, unknown> | null;
  killSwitch: boolean;
  supportedFormats: string[];
  allowConcurrent: boolean;
  exclusiveWith: string[];
  maxPerPage: number;
  loadStrategy: string;
  createdAt: Date;
  updatedAt: Date;
  placements?: AdPlacementRecord[];
}

export interface AdSlotRecord {
  id: string;
  name: string;
  slug: string;
  position: string;
  format: string;
  description: string | null;
  responsiveSizes: Record<string, unknown>;
  maxWidth: number | null;
  maxHeight: number | null;
  responsive: boolean;
  containerSelector: string | null;
  excludeSelectors: string[];
  pageTypes: string[];
  categories: string[];
  excludePages: string[];
  isActive: boolean;
  multiProvider: boolean;
  renderPriority: number;
  createdAt: Date;
  updatedAt: Date;
  placements?: AdPlacementRecord[];
}

export interface AdPlacementRecord {
  id: string;
  providerId: string;
  provider?: AdProviderRecord;
  slotId: string;
  slot?: AdSlotRecord;
  adUnitId: string | null;
  adCode: string | null;
  customHtml: string | null;
  autoResize: boolean;
  minContainerWidth: number;
  maxContainerWidth: number;
  visibleBreakpoints: string[];
  autoPlace: boolean;
  autoStrategy: string;
  minParagraphs: number;
  paragraphGap: number;
  maxAdsPerPage: number;
  lazyOffset: number;
  refreshIntervalSec: number;
  closeable: boolean;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  impressions: number;
  clicks: number;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdLogRecord {
  id: string;
  placementId: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AdSettingsRecord {
  id: string;
  sanitizeAdCode: boolean;
  allowedProviderTypes: string[];
  lazyLoadAds: boolean;
  defaultLazyOffset: number;
  globalMaxAdsPerPage: number;
  defaultMinParagraphs: number;
  defaultParagraphGap: number;
  skipCodeBlocks: boolean;
  respectSectionBreaks: boolean;
  enableAutoPlacement: boolean;
  autoAdStrategy: string;
  enableAnalytics: boolean;
  enableComplianceScanning: boolean;
  cacheTtlSeconds: number;
  eventRateLimitMax: number;
  eventRateLimitWindowMs: number;
  minContentLength: number;
  positionKillSwitches: Record<string, boolean>;
  enableWidgetAds: boolean;
  widgetAdConfig: Record<string, unknown>;
  enableResponsive: boolean;
  breakpoints: Record<string, unknown>;
  concurrencyPolicy: Record<string, unknown>;
  maxViewportAdCoverage: number;
  minAdSpacingPx: number;
  deferUntilLcp: boolean;
  enableAdsTxt: boolean;
  adsTxtCustomEntries: string[];
  requireConsent: boolean;
  consentModes: string[];
  enableAdRefresh: boolean;
  minRefreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdsAggregateResult {
  _sum?: { impressions?: number | null; clicks?: number | null; revenue?: number | null };
}

/* ── Prisma client interface ─────────────────────────────────────────────── */

export interface AdsPrismaClient {
  adProvider: {
    create(a: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdProviderRecord>;
    findMany(a?: Record<string, unknown>): Promise<AdProviderRecord[]>;
    findUnique(a: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdProviderRecord | null>;
    update(a: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdProviderRecord>;
    updateMany(a: { where?: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    delete(a: { where: Record<string, unknown> }): Promise<AdProviderRecord>;
    count(a?: Record<string, unknown>): Promise<number>;
  };
  adSlot: {
    create(a: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdSlotRecord>;
    findMany(a?: Record<string, unknown>): Promise<AdSlotRecord[]>;
    findUnique(a: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdSlotRecord | null>;
    update(a: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdSlotRecord>;
    delete(a: { where: Record<string, unknown> }): Promise<AdSlotRecord>;
    count(a?: Record<string, unknown>): Promise<number>;
  };
  adPlacement: {
    create(a: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdPlacementRecord>;
    findMany(a?: Record<string, unknown>): Promise<AdPlacementRecord[]>;
    findUnique(a: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdPlacementRecord | null>;
    update(a: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<AdPlacementRecord>;
    delete(a: { where: Record<string, unknown> }): Promise<AdPlacementRecord>;
    count(a?: Record<string, unknown>): Promise<number>;
    aggregate(a: Record<string, unknown>): Promise<AdsAggregateResult>;
  };
  adLog: {
    create(a: { data: Record<string, unknown> }): Promise<AdLogRecord>;
    findMany(a?: Record<string, unknown>): Promise<AdLogRecord[]>;
    groupBy(a: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    count(a?: Record<string, unknown>): Promise<number>;
  };
  adSettings: {
    findFirst(a?: Record<string, unknown>): Promise<AdSettingsRecord | null>;
    create(a: { data: Record<string, unknown> }): Promise<AdSettingsRecord>;
    update(a: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<AdSettingsRecord>;
    delete(a: { where: Record<string, unknown> }): Promise<AdSettingsRecord>;
  };
}

/* ========================================================================== */
/*  API RESPONSE                                                              */
/* ========================================================================== */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: AdsErrorCode | string; message: string };
}
