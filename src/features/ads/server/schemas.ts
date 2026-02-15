// src/features/ads/server/schemas.ts
import { z } from "zod";
import { AD_PROVIDER_TYPES, AD_POSITIONS, AD_FORMATS, AUTO_AD_STRATEGIES, AD_EVENT_TYPES, RESPONSIVE_BREAKPOINTS } from "../types";

// ─── Shared helpers ─────────────────────────────────────────────────────────
export const adSizeSchema = z.object({ width: z.number().int().positive(), height: z.number().int().positive() });

const breakpointSizeSchema = z.object({
  preferred: adSizeSchema,
  alternatives: z.array(adSizeSchema).optional(),
  hidden: z.boolean().optional(),
});
export const responsiveSizeMapSchema = z.record(z.enum(RESPONSIVE_BREAKPOINTS), breakpointSizeSchema).optional();

export const widgetAdConfigSchema = z.object({
  widgetGap: z.number().int().min(0).default(2),
  minWidgetsBefore: z.number().int().min(0).default(1),
  maxPerArea: z.number().int().min(1).default(3),
  targetSelectors: z.array(z.string()).default([]),
  excludeBesideSelectors: z.array(z.string()).default([]),
});

export const concurrencyPolicySchema = z.object({
  enabled: z.boolean().default(false),
  maxProvidersPerPage: z.number().int().min(1).default(3),
  priorityResolution: z.enum(["highest_wins", "round_robin", "random"]).default("highest_wins"),
  mutuallyExclusivePairs: z.array(z.tuple([z.enum(AD_PROVIDER_TYPES), z.enum(AD_PROVIDER_TYPES)])).default([]),
  adsenseMaxDisplay: z.number().int().min(0).default(3),
  adsenseMaxLink: z.number().int().min(0).default(3),
  maxNativeWidgets: z.number().int().min(0).default(4),
});

// ─── Provider schemas ───────────────────────────────────────────────────────
export const createProviderSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(150).optional(),
  type: z.enum(AD_PROVIDER_TYPES),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
  clientId: z.string().nullish(),
  publisherId: z.string().nullish(),
  apiKey: z.string().nullish(),
  scriptUrl: z.string().url().nullish(),
  dataAttributes: z.record(z.string(), z.string()).default({}),
  config: z.record(z.string(), z.unknown()).nullish(),
  killSwitch: z.boolean().default(false),
  supportedFormats: z.array(z.enum(AD_FORMATS)).default([]),
  allowConcurrent: z.boolean().default(true),
  exclusiveWith: z.array(z.string()).default([]),
  maxPerPage: z.number().int().min(1).default(5),
  loadStrategy: z.enum(["eager", "lazy", "intersection", "idle"]).default("lazy"),
});

export const updateProviderSchema = createProviderSchema.partial();

// ─── Slot schemas ───────────────────────────────────────────────────────────
export const createSlotSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(150).optional(),
  position: z.enum(AD_POSITIONS),
  format: z.enum(AD_FORMATS).default("DISPLAY"),
  description: z.string().max(500).nullish(),
  responsiveSizes: z.any().optional(),
  maxWidth: z.number().int().positive().nullish(),
  maxHeight: z.number().int().positive().nullish(),
  responsive: z.boolean().default(true),
  containerSelector: z.string().max(250).nullish(),
  excludeSelectors: z.array(z.string()).default([]),
  pageTypes: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  excludePages: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  multiProvider: z.boolean().default(false),
  renderPriority: z.number().int().default(0),
});

export const updateSlotSchema = createSlotSchema.partial();

// ─── Placement schemas ──────────────────────────────────────────────────────
export const createPlacementSchema = z.object({
  providerId: z.string().cuid(),
  slotId: z.string().cuid(),
  adUnitId: z.string().nullish(),
  adCode: z.string().max(50_000).nullish(),
  customHtml: z.string().max(100_000).nullish(),
  autoResize: z.boolean().default(true),
  minContainerWidth: z.number().int().min(0).default(0),
  maxContainerWidth: z.number().int().min(0).default(0),
  visibleBreakpoints: z.array(z.enum(RESPONSIVE_BREAKPOINTS)).default([]),
  autoPlace: z.boolean().default(false),
  autoStrategy: z.enum(AUTO_AD_STRATEGIES).default("PARAGRAPH_COUNT"),
  minParagraphs: z.number().int().min(0).default(3),
  paragraphGap: z.number().int().min(0).default(4),
  maxAdsPerPage: z.number().int().min(1).default(5),
  lazyOffset: z.number().int().min(0).default(200),
  refreshIntervalSec: z.number().int().min(0).default(0),
  closeable: z.boolean().default(false),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  isActive: z.boolean().default(true),
});

export const updatePlacementSchema = createPlacementSchema.partial();

// ─── Event schema ───────────────────────────────────────────────────────────
export const recordEventSchema = z.object({
  placementId: z.string().cuid(),
  eventType: z.enum(AD_EVENT_TYPES),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

// ─── Config / settings schema ───────────────────────────────────────────────
export const updateAdsConfigSchema = z.object({
  adsEnabled: z.boolean().optional(),
  sanitizeAdCode: z.boolean().optional(),
  allowedProviderTypes: z.array(z.enum(AD_PROVIDER_TYPES)).optional(),
  lazyLoadAds: z.boolean().optional(),
  defaultLazyOffset: z.number().int().min(0).optional(),
  globalMaxAdsPerPage: z.number().int().min(1).optional(),
  defaultMinParagraphs: z.number().int().min(0).optional(),
  defaultParagraphGap: z.number().int().min(0).optional(),
  skipCodeBlocks: z.boolean().optional(),
  respectSectionBreaks: z.boolean().optional(),
  enableAutoPlacement: z.boolean().optional(),
  autoAdStrategy: z.enum(AUTO_AD_STRATEGIES).optional(),
  enableAnalytics: z.boolean().optional(),
  enableComplianceScanning: z.boolean().optional(),
  cacheTtlSeconds: z.number().int().min(0).optional(),
  eventRateLimitMax: z.number().int().min(0).optional(),
  eventRateLimitWindowMs: z.number().int().min(0).optional(),
  minContentLength: z.number().int().min(0).optional(),
  positionKillSwitches: z.record(z.string(), z.boolean()).optional(),
  enableWidgetAds: z.boolean().optional(),
  widgetAdConfig: widgetAdConfigSchema.optional(),
  enableResponsive: z.boolean().optional(),
  breakpoints: z.record(z.string(), z.number()).optional(),
  concurrencyPolicy: concurrencyPolicySchema.optional(),
  maxViewportAdCoverage: z.number().int().min(0).optional(),
  minAdSpacingPx: z.number().int().min(0).optional(),
  deferUntilLcp: z.boolean().optional(),
  enableAdsTxt: z.boolean().optional(),
  adsTxtCustomEntries: z.array(z.string()).optional(),
  requireConsent: z.boolean().optional(),
  consentModes: z.array(z.string()).optional(),
  enableAdRefresh: z.boolean().optional(),
  minRefreshInterval: z.number().int().min(0).optional(),
});

// ─── Query schemas ──────────────────────────────────────────────────────────
export const pageQuerySchema = z.object({
  pageType: z.string().optional(),
  category: z.string().optional(),
  containerWidth: z.coerce.number().int().optional(),
});

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const listQuerySchema = z.object({
  activeOnly: z.enum(["true", "false", "1", "0", ""]).optional().default("false").transform(v => v === "true" || v === "1"),
});

// ─── Inferred types ─────────────────────────────────────────────────────────
export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;
export type UpdatePlacementInput = z.infer<typeof updatePlacementSchema>;
export type RecordEventInput = z.infer<typeof recordEventSchema>;
export type UpdateAdsConfigInput = z.infer<typeof updateAdsConfigSchema>;
export type PageQuery = z.infer<typeof pageQuerySchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
