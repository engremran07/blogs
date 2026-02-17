// src/features/distribution/index.ts
// Barrel exports for the Distribution feature module.

/* ── Types & Enums ───────────────────────────────────────────────── */
export {
  SocialPlatform,
  DistributionStatus,
  MessageStyle,
  DistributionEvent,
} from "./types";

export type {
  PlatformCredentials,
  PlatformRule,
  SocialPostPayload,
  SocialPostResult,
  SocialConnector,
  DistributionRecordData,
  DistributionChannelData,
  PaginatedResult,
  DistributePostInput,
  RetryDistributionInput,
  CancelDistributionInput,
  BulkDistributeInput,
  CreateChannelInput,
  UpdateChannelInput,
  QueryDistributionsInput,
  PostData,
  DistributionArtifact,
  DistributionConfig,
  DistributionEventPayload,
  CampaignSummary,
  DistributionPrismaClient,
  PrismaDelegate,
  ApiResponse,
  WhiteHatPolicy,
  PlatformRateLimit,
  ComplianceCheckResult,
} from "./types";

/* ── Server ──────────────────────────────────────────────────────── */
export { DistributionService } from "./server/distribution.service";
export { autoDistributePost } from "./server/auto-publish";
export { MessageBuilder } from "./server/message-builder";
export type { MessageBuilderInput, BuiltMessage } from "./server/message-builder";
export { Sanitize as DistributionSanitize } from "./server/sanitization";
export { DistributionEventBus } from "./server/events";
export type { DistributionEventHandler } from "./server/events";
export {
  getConnector,
  getSupportedPlatforms,
  registerConnector,
  ConnectorError,
} from "./server/connectors";
export {
  DEFAULT_CONFIG as DISTRIBUTION_DEFAULT_CONFIG,
  PLATFORM_RULES,
  SUPPORTED_CONNECTORS,
  DEFAULT_CHANNELS,
  VALID_STATUS_TRANSITIONS,
  MAX_BULK_POST_IDS,
  MAX_BULK_PLATFORMS,
  PLATFORM_RATE_LIMITS,
  WHITE_HAT_DEFAULTS,
} from "./server/constants";

export {
  distributePostSchema,
  retryDistributionSchema,
  cancelDistributionSchema,
  bulkDistributeSchema,
  createChannelSchema,
  updateChannelSchema,
  queryDistributionsSchema,
  campaignSummarySchema,
} from "./server/schemas";
export type {
  DistributePostPayload,
  RetryDistributionPayload,
  CancelDistributionPayload,
  BulkDistributePayload,
  CreateChannelPayload,
  UpdateChannelPayload,
  QueryDistributionsPayload,
  CampaignSummaryPayload,
} from "./server/schemas";
