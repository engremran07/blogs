// src/features/distribution/server/schemas.ts
import { z } from "zod";
import { SocialPlatform, DistributionStatus, MessageStyle } from "../types";

const platformEnum = z.nativeEnum(SocialPlatform);
const statusEnum = z.nativeEnum(DistributionStatus);
const styleEnum = z.nativeEnum(MessageStyle);

// ─── Distribute Post ────────────────────────────────────────────────────────
export const distributePostSchema = z.object({
  postId: z.string().min(1),
  platforms: z.array(platformEnum).min(1),
  scheduledFor: z.coerce.date().optional(),
  messageOverride: z.string().max(5_000).optional(),
  style: styleEnum.optional(),
});
export type DistributePostPayload = z.infer<typeof distributePostSchema>;

// ─── Retry / Cancel ─────────────────────────────────────────────────────────
export const retryDistributionSchema = z.object({
  recordId: z.string().min(1),
});
export type RetryDistributionPayload = z.infer<typeof retryDistributionSchema>;

export const cancelDistributionSchema = z.object({
  recordId: z.string().min(1),
});
export type CancelDistributionPayload = z.infer<typeof cancelDistributionSchema>;

// ─── Bulk ───────────────────────────────────────────────────────────────────
export const bulkDistributeSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(50),
  platforms: z.array(platformEnum).min(1).max(10),
  scheduledFor: z.coerce.date().optional(),
  style: styleEnum.optional(),
});
export type BulkDistributePayload = z.infer<typeof bulkDistributeSchema>;

// ─── Channels ───────────────────────────────────────────────────────────────
export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  platform: platformEnum,
  url: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  isCustom: z.boolean().default(false),
  autoPublish: z.boolean().default(false),
  credentials: z.record(z.string(), z.unknown()).default({}),
  renewIntervalDays: z.number().int().min(0).default(0),
});
export type CreateChannelPayload = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  autoPublish: z.boolean().optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  renewIntervalDays: z.number().int().min(0).optional(),
  platformRules: z.object({
    maxChars: z.number().int().positive(),
    style: styleEnum,
    includeHashtags: z.boolean(),
    hashtagLimit: z.number().int().min(0),
    supportsImages: z.boolean(),
    supportsLinkPreview: z.boolean(),
    supportsScheduling: z.boolean(),
  }).optional(),
});
export type UpdateChannelPayload = z.infer<typeof updateChannelSchema>;

// ─── Query ──────────────────────────────────────────────────────────────────
export const queryDistributionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  postId: z.string().optional(),
  platform: platformEnum.optional(),
  status: statusEnum.optional(),
  channelId: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type QueryDistributionsPayload = z.infer<typeof queryDistributionsSchema>;

// ─── Campaign Summary ───────────────────────────────────────────────────────
export const campaignSummarySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(365).default(30),
});
export type CampaignSummaryPayload = z.infer<typeof campaignSummarySchema>;

// ─── Settings ───────────────────────────────────────────────────────────────
export const updateDistributionSettingsSchema = z.object({
  distributionEnabled: z.boolean().optional(),
  maxConcurrentDistributions: z.number().int().min(1).optional(),
  maxRetries: z.number().int().min(0).optional(),
  retryDelayMs: z.number().int().min(0).optional(),
  retryBackoffMultiplier: z.number().min(1).optional(),
  connectorTimeoutMs: z.number().int().min(0).optional(),
  validationTimeoutMs: z.number().int().min(0).optional(),
  scheduledBatchSize: z.number().int().min(1).optional(),
  maxHistoryPerPost: z.number().int().min(1).optional(),
  defaultMessageStyle: styleEnum.optional(),
  siteBaseUrl: z.string().optional(),
  enableCampaignTracking: z.boolean().optional(),
  utmSource: z.string().optional(),
  retentionDays: z.number().int().min(1).optional(),
});
export type UpdateDistributionSettingsPayload = z.infer<typeof updateDistributionSettingsSchema>;
