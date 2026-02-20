// src/features/distribution/types.ts
// Complete type definitions for the Distribution module.

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum SocialPlatform {
  TWITTER = "twitter",
  FACEBOOK = "facebook",
  LINKEDIN = "linkedin",
  TELEGRAM = "telegram",
  WHATSAPP = "whatsapp",
  PINTEREST = "pinterest",
  REDDIT = "reddit",
  INSTAGRAM = "instagram",
  TIKTOK = "tiktok",
  MEDIUM = "medium",
  YOUTUBE = "youtube",
  CUSTOM = "custom",
}

export enum DistributionStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  PUBLISHING = "PUBLISHING",
  PUBLISHED = "PUBLISHED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  RATE_LIMITED = "RATE_LIMITED",
}

export enum MessageStyle {
  CONCISE = "concise",
  PROFESSIONAL = "professional",
  CASUAL = "casual",
  THREAD = "thread",
  PROMOTIONAL = "promotional",
}

export enum DistributionEvent {
  DISTRIBUTED = "distribution.distributed",
  SCHEDULED = "distribution.scheduled",
  PUBLISHED = "distribution.published",
  FAILED = "distribution.failed",
  RETRIED = "distribution.retried",
  CANCELLED = "distribution.cancelled",
  RATE_LIMITED = "distribution.rate_limited",
  CHANNEL_CREATED = "distribution.channel_created",
  CHANNEL_UPDATED = "distribution.channel_updated",
  CHANNEL_DELETED = "distribution.channel_deleted",
  BULK_DISTRIBUTED = "distribution.bulk_distributed",
  SETTINGS_UPDATED = "distribution.settings_updated",
}

// ─── Platform Credentials ───────────────────────────────────────────────────

export interface PlatformCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  refreshToken?: string;
  pageId?: string;
  channelId?: string;
  boardId?: string;
  subreddit?: string;
  webhookUrl?: string;
  phoneNumberId?: string;
  botToken?: string;
  chatId?: string;
}

// ─── Platform Rules ─────────────────────────────────────────────────────────

export interface PlatformRule {
  maxChars: number;
  style: MessageStyle;
  includeHashtags: boolean;
  hashtagLimit: number;
  supportsImages: boolean;
  supportsLinkPreview: boolean;
  supportsScheduling: boolean;
}

// ─── Platform Rate Limits ───────────────────────────────────────────────────

export interface PlatformRateLimit {
  maxPostsPerDay: number;
  minIntervalMinutes: number;
  shortenedUrlLength?: number;
}

// ─── White-Hat Distribution Policy ──────────────────────────────────────────

export interface WhiteHatPolicy {
  preventDuplicates: boolean;
  duplicateWindowHours: number;
  enforceCooldowns: boolean;
  enforceDailyLimits: boolean;
  requireAttribution: boolean;
  attributionText: string;
  maxHashtagDensity: number;
  respectRateLimits: boolean;
}

// ─── Compliance Check Result ────────────────────────────────────────────────

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  cooldownRemainingSeconds?: number;
  dailyRemaining?: number;
}

// ─── Social Post Payload / Result ───────────────────────────────────────────

export interface SocialPostPayload {
  text: string;
  title?: string;
  url?: string;
  imageUrl?: string;
  hashtags?: string[];
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

export interface SocialPostResult {
  success: boolean;
  platform: SocialPlatform;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
  publishedAt?: Date;
}

// ─── Connector Interface ────────────────────────────────────────────────────

export interface SocialConnector {
  readonly platform: SocialPlatform;
  post(
    payload: SocialPostPayload,
    credentials: PlatformCredentials,
  ): Promise<SocialPostResult>;
  validateCredentials(credentials: PlatformCredentials): Promise<boolean>;
}

// ─── Distribution Record ────────────────────────────────────────────────────

export interface DistributionRecordData {
  id: string;
  postId: string;
  channelId?: string | null;
  platform: string;
  status: string;
  content: string;
  scheduledFor?: Date | null;
  publishedAt?: Date | null;
  externalId?: string | null;
  externalUrl?: string | null;
  error?: string | null;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Distribution Channel ───────────────────────────────────────────────────

export interface DistributionChannelData {
  id: string;
  name: string;
  platform: string;
  url?: string | null;
  enabled: boolean;
  isCustom: boolean;
  autoPublish: boolean;
  credentials: PlatformCredentials;
  platformRules?: PlatformRule | null;
  renewIntervalDays: number;
  lastPublishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// ─── Service Input Types ────────────────────────────────────────────────────

export interface DistributePostInput {
  postId: string;
  platforms: SocialPlatform[];
  scheduledFor?: Date;
  messageOverride?: string;
  style?: MessageStyle;
}

export interface RetryDistributionInput {
  recordId: string;
}

export interface CancelDistributionInput {
  recordId: string;
}

export interface BulkDistributeInput {
  postIds: string[];
  platforms: SocialPlatform[];
  scheduledFor?: Date;
  style?: MessageStyle;
}

export interface CreateChannelInput {
  name: string;
  platform: SocialPlatform;
  url?: string;
  enabled?: boolean;
  isCustom?: boolean;
  autoPublish?: boolean;
  credentials?: PlatformCredentials;
  renewIntervalDays?: number;
}

export interface UpdateChannelInput {
  name?: string;
  url?: string;
  enabled?: boolean;
  autoPublish?: boolean;
  credentials?: PlatformCredentials;
  renewIntervalDays?: number;
  platformRules?: PlatformRule;
}

export interface QueryDistributionsInput {
  page?: number;
  limit?: number;
  postId?: string;
  platform?: SocialPlatform;
  status?: DistributionStatus;
  channelId?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Post Data ──────────────────────────────────────────────────────────────

export interface PostData {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  tags?: Array<{ name: string }>;
  featuredImage?: string | null;
  publishedUrl?: string;
}

// ─── Distribution Artifact ──────────────────────────────────────────────────

export interface DistributionArtifact {
  platform: SocialPlatform;
  channelId?: string;
  content: string;
  status: DistributionStatus;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  distributedAt: Date;
}

// ─── Campaign Analytics Types ───────────────────────────────────────────────

export type CampaignGoalStatus = "on_track" | "at_risk" | "off_track";
export type CampaignGoalTrend = "up" | "down" | "flat";

export interface CampaignBreakdownItem {
  source?: string;
  medium?: string;
  campaign?: string;
  visits: number;
  avgScore?: number;
  conversionRate?: number;
  roiIndex?: number;
}

export interface CampaignTopPost {
  postId: string;
  title: string;
  slug: string;
  visits: number;
  avgScore: number;
}

export interface CampaignRoiTrendPoint {
  date: string;
  visits: number;
  convertedVisits: number;
  conversionRate: number;
  avgScore: number;
  engagementDepthRate: number;
  roiIndex: number;
}

export interface CampaignConversionGoal {
  key: string;
  label: string;
  unit: "percent" | "score" | "index";
  current: number;
  target: number;
  progress: number;
  status: CampaignGoalStatus;
  trend: CampaignGoalTrend;
  delta: number;
}

export interface CampaignConversionGoalsSummary {
  totalConvertedVisits: number;
  conversionRate: number;
  engagementDepthRate: number;
  avgVisitScore: number;
  roiIndex: number;
  goals: CampaignConversionGoal[];
  goalStatus: Record<CampaignGoalStatus, number>;
}

export interface CampaignSummary {
  windowDays: number;
  totalVisits: number;
  uniqueSources: number;
  uniqueMediums: number;
  uniqueCampaigns: number;
  bySource: CampaignBreakdownItem[];
  topCampaigns: CampaignBreakdownItem[];
  topPosts: CampaignTopPost[];
  roiTrendline: CampaignRoiTrendPoint[];
  conversionGoals: CampaignConversionGoalsSummary;
}

// ─── Distribution Event Payload ─────────────────────────────────────────────

export interface DistributionEventPayload {
  event?: DistributionEvent;
  recordId?: string;
  postId?: string;
  channelId?: string;
  platform?: SocialPlatform;
  action: DistributionEvent;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// ─── Module Config ──────────────────────────────────────────────────────────

export interface DistributionConfig {
  distributionEnabled?: boolean;
  maxConcurrentDistributions?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  retryBackoffMultiplier?: number;
  connectorTimeoutMs?: number;
  validationTimeoutMs?: number;
  scheduledBatchSize?: number;
  maxHistoryPerPost?: number;
  defaultMessageStyle?: MessageStyle;
  siteBaseUrl?: string;
  enableCampaignTracking?: boolean;
  utmSource?: string;
  retentionDays?: number;
  whiteHat?: Partial<WhiteHatPolicy>;
}

// ─── API Response Envelope ──────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Minimal Prisma Interface (DI boundary) ─────────────────────────────────

import type {
  PrismaDelegate,
  PrismaDelegateWithAggregate,
} from "@/shared/prisma-delegate.types";
export type { PrismaDelegate };

export interface DistributionPrismaClient {
  distributionRecord: PrismaDelegateWithAggregate<DistributionRecordData>;
  distributionChannel: PrismaDelegate<DistributionChannelData>;
  post: PrismaDelegate;
  siteSettings: PrismaDelegate;
}
