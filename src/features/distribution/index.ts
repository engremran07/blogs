// src/features/distribution/index.ts
// Barrel exports for the Distribution feature module.

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
