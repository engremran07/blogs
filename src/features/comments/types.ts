// comments/types.ts
// Complete type definitions — framework-agnostic, zero dependencies

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum CommentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  SPAM = "SPAM",
  FLAGGED = "FLAGGED",
  REJECTED = "REJECTED",
  DELETED = "DELETED",
}

export enum CommentSortField {
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  UPVOTES = "upvotes",
  DOWNVOTES = "downvotes",
}

export enum VoteType {
  UP = "UP",
  DOWN = "DOWN",
}

export enum ModerationAction {
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  FLAG = "FLAG",
  UNFLAG = "UNFLAG",
  PIN = "PIN",
  UNPIN = "UNPIN",
  RESOLVE = "RESOLVE",
  UNRESOLVE = "UNRESOLVE",
  DELETE = "DELETE",
  RESTORE = "RESTORE",
}

export enum CommentEvent {
  CREATED = "comment.created",
  UPDATED = "comment.updated",
  DELETED = "comment.deleted",
  APPROVED = "comment.approved",
  REJECTED = "comment.rejected",
  FLAGGED = "comment.flagged",
  UNFLAGGED = "comment.unflagged",
  PINNED = "comment.pinned",
  UNPINNED = "comment.unpinned",
  RESOLVED = "comment.resolved",
  UNRESOLVED = "comment.unresolved",
  VOTED = "comment.voted",
  REPLIED = "comment.replied",
  SPAM_DETECTED = "comment.spam_detected",
  RESTORED = "comment.restored",
  BULK_ACTION = "comment.bulk_action",
  AUTO_APPROVED = "comment.auto_approved",
  EDITED = "comment.edited",
  SETTINGS_UPDATED = "comment.settings_updated",
  AUTO_CLOSED = "comment.auto_closed",
  RATE_LIMITED = "comment.rate_limited",
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

// ─── Comment Data ───────────────────────────────────────────────────────────

export interface CommentAuthor {
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  authorName?: string;
}

export interface CommentData {
  id: string;
  content: string;
  postId: string;
  userId?: string | null;
  parentId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  authorWebsite?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;

  // Primary DB columns
  status: string;
  spamScore: number;
  spamSignals: string[];
  flagCount: number;
  flagReasons: string[];
  isPinned: boolean;
  isResolved: boolean;
  isEdited: boolean;
  upvotes: number;
  downvotes: number;

  editedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations (populated by includes)
  user?: CommentAuthor;
  post?: { id: string; title: string; slug: string };
  replies?: CommentData[];
  _count?: { replies: number };
}

export interface CommentStats {
  total: number;
  approved: number;
  pending: number;
  spam: number;
  flagged: number;
  pinned: number;
  resolved: number;
  deleted: number;
  todayCount: number;
  averageSpamScore?: number;
}

export interface SpamCheckResult {
  isSpam: boolean;
  score: number;
  reasons: string[];
  signals: string[];
}

// ─── Event Payload ──────────────────────────────────────────────────────────

export interface CommentEventPayload {
  event?: CommentEvent;
  commentId: string;
  postId?: string;
  userId?: string | null;
  moderatorId?: string;
  action?: CommentEvent;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// ─── Service Input Types ────────────────────────────────────────────────────

export interface CreateCommentInput {
  postId: string;
  content: string;
  authorName?: string;
  authorEmail?: string;
  authorWebsite?: string;
  parentId?: string;
  userId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface VoteInput {
  type: VoteType;
}

export interface FlagInput {
  reason: string;
}

export interface BulkIdsInput {
  ids: string[];
}

export interface BulkPinInput {
  ids: string[];
  pinned: boolean;
}

export interface BulkResolveInput {
  ids: string[];
  resolved: boolean;
}

export interface QueryCommentsInput {
  page?: number;
  limit?: number;
  sortBy?: CommentSortField;
  sortOrder?: "asc" | "desc";
  status?: CommentStatus;
  postId?: string;
  userId?: string;
  search?: string;
  isPinned?: boolean;
  isResolved?: boolean;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

// ─── Learning Signal ────────────────────────────────────────────────────────

export interface LearningSignalData {
  signalType: string;
  postId?: string | null;
  userId?: string | null;
  score?: number;
  payload?: Record<string, unknown>;
}

// ─── Module Config ──────────────────────────────────────────────────────────

export interface CommentsConfig {
  /** Max content length in characters (default: 5000) */
  maxContentLength?: number;
  /** Max author name length (default: 120) */
  maxAuthorNameLength?: number;
  /** Max author website URL length (default: 300) */
  maxWebsiteLength?: number;
  /** Maximum depth of nested replies (default: 5) */
  maxReplyDepth?: number;
  /** Approved comments needed before auto-approving (default: 3) */
  autoApproveThreshold?: number;
  /** Additional spam keywords beyond defaults */
  customSpamKeywords?: string[];
  /** Max links before flagging as spam (default: 3) */
  maxLinksBeforeSpam?: number;
  /** Capital letter ratio threshold for spam (default: 0.5) */
  capsSpamRatio?: number;
  /** Min content length for caps ratio check (default: 20) */
  capsCheckMinLength?: number;
  /** Enable IP/User-Agent tracking (default: true) */
  trackMetadata?: boolean;
  /** Enable voting system (default: true) */
  enableVoting?: boolean;
  /** Enable reactions (default: true) */
  enableReactions?: boolean;
  /** Enable profanity filter (default: false) */
  enableProfanityFilter?: boolean;
  /** Custom profanity words */
  profanityWords?: string[];
  /** Enable learning signals / telemetry (default: true) */
  enableLearningSignals?: boolean;
  /** Days before old spam is eligible for cleanup (default: 30) */
  spamRetentionDays?: number;
  /** Days before soft-deleted comments are purged (default: 90) */
  deletedRetentionDays?: number;

  // ─── Admin-dynamic fields (new) ─────────────────────────────────────────

  /** Global kill switch — disable all commenting (default: true) */
  commentsEnabled?: boolean;
  /** Force all comments to PENDING regardless of auto-approve (default: false) */
  requireModeration?: boolean;
  /** Allow anonymous/guest comments without login (default: true) */
  allowGuestComments?: boolean;
  /** Minutes after posting in which editing is allowed, 0 = unlimited (default: 30) */
  editWindowMinutes?: number;
  /** Auto-close comments on posts older than N days, 0 = never (default: 0) */
  closeCommentsAfterDays?: number;
  /** Max comments per user per post, 0 = unlimited (default: 0) */
  maxCommentsPerPostPerUser?: number;
  /** Max comments per user per hour, 0 = unlimited (default: 0) */
  maxCommentsPerHour?: number;
  /** Flag count before auto-hiding a comment (default: 3) */
  autoFlagThreshold?: number;
  /** Spam score >= this value = auto-marked spam (default: 50) */
  spamScoreThreshold?: number;
  /** Blocked email patterns (exact or wildcard) */
  blockedEmails?: string[];
  /** Blocked link domains */
  blockedDomains?: string[];
  /** Blocked IP addresses or CIDR ranges */
  blockedIps?: string[];
  /** Enable nested threading / replies (default: true) */
  enableThreading?: boolean;
  /** Max pinned comments per post (default: 3) */
  pinnedCommentLimit?: number;
  /** Notify moderators on flag events (default: true) */
  notifyOnFlag?: boolean;
  /** Notify moderators on spam detection (default: false) */
  notifyOnSpam?: boolean;
}

// ─── DB-backed Admin Settings (singleton row) ───────────────────────────────

export interface CommentSystemSettings {
  id: string;

  // Content limits
  maxContentLength: number;
  maxAuthorNameLength: number;
  maxWebsiteLength: number;
  maxReplyDepth: number;

  // Moderation
  commentsEnabled: boolean;
  requireModeration: boolean;
  allowGuestComments: boolean;
  autoApproveThreshold: number;
  editWindowMinutes: number;
  closeCommentsAfterDays: number;

  // Rate limiting
  maxCommentsPerPostPerUser: number;
  maxCommentsPerHour: number;

  // Spam
  maxLinksBeforeSpam: number;
  capsSpamRatio: number;
  capsCheckMinLength: number;
  spamScoreThreshold: number;
  customSpamKeywords: string[];
  blockedEmails: string[];
  blockedDomains: string[];
  blockedIps: string[];

  // Features
  enableVoting: boolean;
  enableReactions: boolean;
  enableThreading: boolean;
  enableProfanityFilter: boolean;
  enableLearningSignals: boolean;
  trackMetadata: boolean;
  profanityWords: string[];

  // Limits
  autoFlagThreshold: number;
  pinnedCommentLimit: number;

  // Retention
  spamRetentionDays: number;
  deletedRetentionDays: number;

  // Notifications
  notifyOnFlag: boolean;
  notifyOnSpam: boolean;

  // Audit
  updatedBy: string | null;
  updatedAt: Date;
}

// ─── Config Consumer (for dynamic propagation) ─────────────────────────────

export interface CommentConfigConsumer {
  updateConfig(cfg: Required<CommentsConfig>): void;
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

export interface CommentsPrismaClient {
  comment: PrismaDelegateWithAggregate<CommentData>;
  commentVote: PrismaDelegate;
  learningSignal: PrismaDelegate<LearningSignalData>;
  commentSettings: PrismaDelegate;
  post: PrismaDelegate;
}
