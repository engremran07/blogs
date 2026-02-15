// src/features/distribution/server/constants.ts
import { SocialPlatform, MessageStyle } from "../types";
import type { DistributionConfig, PlatformRule, PlatformRateLimit, WhiteHatPolicy } from "../types";

export const DEFAULT_CONFIG: DistributionConfig = {
  distributionEnabled: true,
  maxConcurrentDistributions: 5,
  maxRetries: 3,
  retryDelayMs: 5_000,
  retryBackoffMultiplier: 2,
  connectorTimeoutMs: 30_000,
  validationTimeoutMs: 10_000,
  scheduledBatchSize: 50,
  maxHistoryPerPost: 100,
  defaultMessageStyle: MessageStyle.PROFESSIONAL,
  siteBaseUrl: "",
  enableCampaignTracking: true,
  utmSource: "social",
  retentionDays: 90,
};

export const PLATFORM_RULES: Record<string, PlatformRule> = {
  [SocialPlatform.TWITTER]: { maxChars: 280, style: MessageStyle.CONCISE, includeHashtags: true, hashtagLimit: 3, supportsImages: true, supportsLinkPreview: true, supportsScheduling: true },
  [SocialPlatform.FACEBOOK]: { maxChars: 63_206, style: MessageStyle.PROFESSIONAL, includeHashtags: true, hashtagLimit: 5, supportsImages: true, supportsLinkPreview: true, supportsScheduling: true },
  [SocialPlatform.LINKEDIN]: { maxChars: 3_000, style: MessageStyle.PROFESSIONAL, includeHashtags: true, hashtagLimit: 5, supportsImages: true, supportsLinkPreview: true, supportsScheduling: false },
  [SocialPlatform.TELEGRAM]: { maxChars: 4_096, style: MessageStyle.CASUAL, includeHashtags: true, hashtagLimit: 10, supportsImages: true, supportsLinkPreview: true, supportsScheduling: false },
  [SocialPlatform.WHATSAPP]: { maxChars: 4_096, style: MessageStyle.CASUAL, includeHashtags: false, hashtagLimit: 0, supportsImages: true, supportsLinkPreview: true, supportsScheduling: false },
  [SocialPlatform.PINTEREST]: { maxChars: 500, style: MessageStyle.PROMOTIONAL, includeHashtags: true, hashtagLimit: 20, supportsImages: true, supportsLinkPreview: false, supportsScheduling: true },
  [SocialPlatform.REDDIT]: { maxChars: 40_000, style: MessageStyle.CASUAL, includeHashtags: false, hashtagLimit: 0, supportsImages: true, supportsLinkPreview: true, supportsScheduling: false },
};

export const SUPPORTED_CONNECTORS: SocialPlatform[] = [
  SocialPlatform.TWITTER, SocialPlatform.FACEBOOK, SocialPlatform.LINKEDIN,
  SocialPlatform.TELEGRAM, SocialPlatform.WHATSAPP, SocialPlatform.PINTEREST,
  SocialPlatform.REDDIT,
];

export const DEFAULT_CHANNELS: Array<{ name: string; platform: SocialPlatform }> = [
  { name: "Twitter", platform: SocialPlatform.TWITTER },
  { name: "Facebook", platform: SocialPlatform.FACEBOOK },
  { name: "LinkedIn", platform: SocialPlatform.LINKEDIN },
];

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["SCHEDULED", "PUBLISHING", "CANCELLED"],
  SCHEDULED: ["PUBLISHING", "CANCELLED"],
  PUBLISHING: ["PUBLISHED", "FAILED", "RATE_LIMITED"],
  FAILED: ["PENDING", "CANCELLED"],
  RATE_LIMITED: ["PENDING", "CANCELLED"],
  PUBLISHED: [],
  CANCELLED: [],
};

export const MAX_BULK_POST_IDS = 50;
export const MAX_BULK_PLATFORMS = 10;
export const MAX_MESSAGE_OVERRIDE_LENGTH = 5_000;
export const MAX_CHANNEL_NAME_LENGTH = 100;
export const MAX_CHANNEL_URL_LENGTH = 500;
export const MAX_HASHTAG_LENGTH = 50;
export const MAX_HASHTAGS = 30;

export const PLATFORM_RATE_LIMITS: Record<string, PlatformRateLimit> = {
  [SocialPlatform.TWITTER]: { maxPostsPerDay: 50, minIntervalMinutes: 5, shortenedUrlLength: 23 },
  [SocialPlatform.FACEBOOK]: { maxPostsPerDay: 25, minIntervalMinutes: 10 },
  [SocialPlatform.LINKEDIN]: { maxPostsPerDay: 20, minIntervalMinutes: 15 },
  [SocialPlatform.TELEGRAM]: { maxPostsPerDay: 50, minIntervalMinutes: 1 },
  [SocialPlatform.WHATSAPP]: { maxPostsPerDay: 10, minIntervalMinutes: 30 },
  [SocialPlatform.PINTEREST]: { maxPostsPerDay: 25, minIntervalMinutes: 10 },
  [SocialPlatform.REDDIT]: { maxPostsPerDay: 10, minIntervalMinutes: 60 },
};

export const WHITE_HAT_DEFAULTS: WhiteHatPolicy = {
  preventDuplicates: true,
  duplicateWindowHours: 24,
  enforceCooldowns: true,
  enforceDailyLimits: true,
  requireAttribution: false,
  attributionText: "",
  maxHashtagDensity: 0.3,
  respectRateLimits: true,
};
