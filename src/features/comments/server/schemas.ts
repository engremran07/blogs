// comments/schemas.ts
// Zod validation schemas — replaces class-validator DTOs
// Usage: schemas.createComment.parse(body) in route handlers

import { z } from 'zod';
import { CommentSortField, CommentStatus, VoteType } from '../types';

// ─── Create Comment ─────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  content: z.string()
    .min(1, 'Comment must not be empty')
    .max(5000, 'Comment must not exceed 5000 characters'),
  authorName: z.string().max(120, 'Name must not exceed 120 characters').optional(),
  authorEmail: z.string().email('Invalid email address').max(254).optional(),
  authorWebsite: z.string().url('Invalid URL').max(300).optional(),
  parentId: z.string().optional(),
  userId: z.string().optional(),
});

// ─── Update Comment ─────────────────────────────────────────────────────────

export const updateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment must not be empty')
    .max(5000, 'Comment must not exceed 5000 characters'),
});

// ─── Vote ───────────────────────────────────────────────────────────────────

export const voteSchema = z.object({
  type: z.nativeEnum(VoteType, { error: 'Vote type must be UP or DOWN' }),
});

// ─── Flag ───────────────────────────────────────────────────────────────────

export const flagSchema = z.object({
  reason: z.string()
    .min(1, 'Flag reason is required')
    .max(500, 'Flag reason must not exceed 500 characters'),
});

// ─── Pin / Resolve Toggle ───────────────────────────────────────────────────

export const pinSchema = z.object({
  pinned: z.boolean(),
});

export const resolveSchema = z.object({
  resolved: z.boolean(),
});

// ─── Bulk Actions ───────────────────────────────────────────────────────────

export const bulkIdsSchema = z.object({
  ids: z.array(z.string())
    .min(1, 'At least one ID is required')
    .max(100, 'Cannot process more than 100 at once'),
});

export const bulkPinSchema = bulkIdsSchema.extend({
  pinned: z.boolean(),
});

export const bulkResolveSchema = bulkIdsSchema.extend({
  resolved: z.boolean(),
});

// ─── Query / Filter ─────────────────────────────────────────────────────────

export const queryCommentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.nativeEnum(CommentSortField).default(CommentSortField.CREATED_AT),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.nativeEnum(CommentStatus).optional(),
  postId: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  isPinned: z.coerce.boolean().optional(),
  isResolved: z.coerce.boolean().optional(),
}).partial();

// ─── Inferred Types (use these in route handlers) ───────────────────────────

export type CreateCommentPayload = z.infer<typeof createCommentSchema>;
export type UpdateCommentPayload = z.infer<typeof updateCommentSchema>;
export type VotePayload = z.infer<typeof voteSchema>;
export type FlagPayload = z.infer<typeof flagSchema>;
export type BulkIdsPayload = z.infer<typeof bulkIdsSchema>;
export type BulkPinPayload = z.infer<typeof bulkPinSchema>;
export type BulkResolvePayload = z.infer<typeof bulkResolveSchema>;
export type QueryCommentsPayload = z.infer<typeof queryCommentsSchema>;

// ─── Admin Settings Schema ──────────────────────────────────────────────────

export const updateCommentSettingsSchema = z.object({
  // Content limits
  maxContentLength: z.number().int().min(100).max(50000).optional(),
  maxAuthorNameLength: z.number().int().min(10).max(500).optional(),
  maxWebsiteLength: z.number().int().min(50).max(2000).optional(),
  maxReplyDepth: z.number().int().min(1).max(20).optional(),

  // Moderation
  commentsEnabled: z.boolean().optional(),
  requireModeration: z.boolean().optional(),
  allowGuestComments: z.boolean().optional(),
  autoApproveThreshold: z.number().int().min(0).max(100).optional(),
  editWindowMinutes: z.number().int().min(0).max(10080).optional(), // max 1 week
  closeCommentsAfterDays: z.number().int().min(0).max(3650).optional(), // max 10 years

  // Rate limiting
  maxCommentsPerPostPerUser: z.number().int().min(0).max(1000).optional(),
  maxCommentsPerHour: z.number().int().min(0).max(1000).optional(),

  // Spam
  maxLinksBeforeSpam: z.number().int().min(1).max(50).optional(),
  capsSpamRatio: z.number().min(0).max(1).optional(),
  capsCheckMinLength: z.number().int().min(1).max(500).optional(),
  spamScoreThreshold: z.number().int().min(10).max(100).optional(),
  customSpamKeywords: z.array(z.string().max(100)).max(500).optional(),
  blockedEmails: z.array(z.string().max(254)).max(1000).optional(),
  blockedDomains: z.array(z.string().max(253)).max(1000).optional(),
  blockedIps: z.array(z.string().max(45)).max(10000).optional(),

  // Features
  enableVoting: z.boolean().optional(),
  enableReactions: z.boolean().optional(),
  enableThreading: z.boolean().optional(),
  enableProfanityFilter: z.boolean().optional(),
  enableLearningSignals: z.boolean().optional(),
  trackMetadata: z.boolean().optional(),
  profanityWords: z.array(z.string().max(100)).max(5000).optional(),

  // Limits
  autoFlagThreshold: z.number().int().min(1).max(100).optional(),
  pinnedCommentLimit: z.number().int().min(0).max(50).optional(),

  // Retention
  spamRetentionDays: z.number().int().min(1).max(3650).optional(),
  deletedRetentionDays: z.number().int().min(1).max(3650).optional(),

  // Notifications
  notifyOnFlag: z.boolean().optional(),
  notifyOnSpam: z.boolean().optional(),
}).strict();

export type UpdateCommentSettingsPayload = z.infer<typeof updateCommentSettingsSchema>;
