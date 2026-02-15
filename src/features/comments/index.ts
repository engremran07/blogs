// comments/index.ts
// Barrel export — public API surface

// Types & enums
export {
  CommentStatus,
  CommentSortField,
  VoteType,
  ModerationAction,
  CommentEvent,
} from './types';

export type {
  CommentsConfig,
  CommentData,
  CommentStats,
  PaginatedResult,
  SpamCheckResult,
  CommentEventPayload,
  CreateCommentInput,
  UpdateCommentInput,
  VoteInput,
  FlagInput,
  BulkIdsInput,
  BulkPinInput,
  BulkResolveInput,
  QueryCommentsInput,
  RequestMeta,
  LearningSignalData,
  CommentSystemSettings,
  CommentConfigConsumer,
  CommentsPrismaClient,
  PrismaDelegate,
  ApiSuccess,
  ApiError,
  ApiResponse,
} from './types';

// Constants
export { DEFAULT_CONFIG, SPAM_KEYWORDS, SIGNAL, MODERATOR_ROLES, MAX_BULK_IDS } from './server/constants';

// Zod schemas
export {
  createCommentSchema,
  updateCommentSchema,
  voteSchema,
  flagSchema,
  pinSchema,
  resolveSchema,
  bulkIdsSchema,
  bulkPinSchema,
  bulkResolveSchema,
  queryCommentsSchema,
  updateCommentSettingsSchema,
} from './server/schemas';
export type {
  CreateCommentPayload,
  UpdateCommentPayload,
  VotePayload,
  FlagPayload,
  BulkIdsPayload,
  BulkPinPayload,
  BulkResolvePayload,
  QueryCommentsPayload,
  UpdateCommentSettingsPayload,
} from './server/schemas';

// Utilities
export { Sanitize } from './server/sanitization';

// Event system
export { CommentEventBus } from './server/events';

// Services
export { SpamService } from './server/spam.service';
export { CommentService } from './server/comment.service';
export { ModerationService } from './server/moderation.service';
export { CommentAdminSettingsService } from './server/admin-settings.service';
