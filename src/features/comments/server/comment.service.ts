// comments/comment.service.ts
// Core CRUD service — pure TS + Prisma, no framework dependency
// Usage:
//   import { PrismaClient } from '@prisma/client';
//   const prisma = new PrismaClient();
//   const comments = new CommentService(prisma, spamService, eventBus, config);

import type {
  CommentsPrismaClient,
  CommentsConfig,
  CommentData,
  PaginatedResult,
  CreateCommentInput,
  UpdateCommentInput,
  VoteInput,
  RequestMeta,
  CommentConfigConsumer,
} from '../types';
import { CommentStatus, CommentEvent, VoteType } from '../types';
import { DEFAULT_CONFIG } from './constants';
import { Sanitize } from './sanitization';
import { SpamService } from './spam.service';
import { CommentEventBus } from './events';

export class CommentService implements CommentConfigConsumer {
  private cfg: Required<CommentsConfig>;

  constructor(
    private readonly prisma: CommentsPrismaClient,
    private readonly spam: SpamService,
    private readonly events: CommentEventBus,
    config: Partial<CommentsConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  /** Called by AdminSettingsService when admin changes settings */
  updateConfig(cfg: Required<CommentsConfig>): void {
    this.cfg = { ...cfg };
  }

  // ─── Create ──────────────────────────────────────────────────────────────

  async create(input: CreateCommentInput, meta?: RequestMeta): Promise<CommentData> {
    // Global kill switch
    if (!this.cfg.commentsEnabled) {
      throw new Error('Comments are currently disabled');
    }

    // Auto-close: check if comments are closed on this post
    if (this.cfg.closeCommentsAfterDays > 0) {
      const post = await this.prisma.post.findUnique({
        where: { id: input.postId },
        select: { publishedAt: true, createdAt: true },
      }).catch(() => null);
      if (post) {
        const referenceDate = post.publishedAt ?? post.createdAt;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.cfg.closeCommentsAfterDays);
        if (referenceDate < cutoff) {
          throw new Error(`Comments are closed on posts older than ${this.cfg.closeCommentsAfterDays} days`);
        }
      }
    }

    // Guest comment check
    if (!input.userId && !this.cfg.allowGuestComments) {
      throw new Error('Guest comments are not allowed — please sign in');
    }

    // Blocked IP check
    if (meta?.ipAddress && this.cfg.blockedIps.length > 0) {
      const ip = meta.ipAddress;
      if (this.cfg.blockedIps.some((b) => ip === b || ip.startsWith(b.replace(/\/.*$/, '')))) {
        throw new Error('Your IP address has been blocked');
      }
    }

    // Blocked email check
    if (input.authorEmail && this.cfg.blockedEmails.length > 0) {
      const email = input.authorEmail.toLowerCase();
      if (this.cfg.blockedEmails.some((b) => email === b || email.endsWith(`@${b}`))) {
        throw new Error('This email address is not allowed');
      }
    }

    // Rate limit: per hour (by userId or IP for guests)
    if (this.cfg.maxCommentsPerHour > 0) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (input.userId) {
        const recent = await this.prisma.comment.count({
          where: { userId: input.userId, createdAt: { gte: oneHourAgo } },
        });
        if (recent >= this.cfg.maxCommentsPerHour) {
          throw new Error(`Rate limit: max ${this.cfg.maxCommentsPerHour} comments per hour`);
        }
      } else if (meta?.ipAddress && this.cfg.trackMetadata) {
        const recent = await this.prisma.comment.count({
          where: { ipAddress: meta.ipAddress, userId: null, createdAt: { gte: oneHourAgo } },
        });
        if (recent >= this.cfg.maxCommentsPerHour) {
          throw new Error(`Rate limit: max ${this.cfg.maxCommentsPerHour} comments per hour`);
        }
      }
    }

    // Rate limit: per post per user (by userId or IP for guests)
    if (this.cfg.maxCommentsPerPostPerUser > 0) {
      if (input.userId) {
        const postCount = await this.prisma.comment.count({
          where: { userId: input.userId, postId: input.postId, deletedAt: null },
        });
        if (postCount >= this.cfg.maxCommentsPerPostPerUser) {
          throw new Error(`Max ${this.cfg.maxCommentsPerPostPerUser} comments per post reached`);
        }
      } else if (meta?.ipAddress && this.cfg.trackMetadata) {
        const postCount = await this.prisma.comment.count({
          where: { ipAddress: meta.ipAddress, userId: null, postId: input.postId, deletedAt: null },
        });
        if (postCount >= this.cfg.maxCommentsPerPostPerUser) {
          throw new Error(`Max ${this.cfg.maxCommentsPerPostPerUser} comments per post reached`);
        }
      }
    }

    const content = Sanitize.html(input.content);
    const authorName = input.authorName ? Sanitize.text(input.authorName) : undefined;
    const authorEmail = input.authorEmail ? Sanitize.email(input.authorEmail) : undefined;
    const authorWebsite = input.authorWebsite ? Sanitize.url(input.authorWebsite) : undefined;

    // Validate reply depth
    if (input.parentId) {
      if (!this.cfg.enableThreading) {
        throw new Error('Threaded replies are disabled');
      }
      const depth = await this.getDepth(input.parentId);
      if (depth >= this.cfg.maxReplyDepth) {
        throw new Error(`Maximum reply depth of ${this.cfg.maxReplyDepth} reached`);
      }
    }

    // Spam analysis
    const spamResult = this.spam.analyse(content, authorName ?? undefined, authorEmail ?? undefined, meta);
    const filteredContent = this.spam.filterProfanity(content);

    // Auto-approve logic
    let status = CommentStatus.PENDING;
    if (spamResult.isSpam) {
      status = CommentStatus.SPAM;
    } else if (this.cfg.requireModeration) {
      status = CommentStatus.PENDING; // admin overrides auto-approve
    } else if (input.userId) {
      const approved = await this.prisma.comment.count({
        where: { userId: input.userId, status: CommentStatus.APPROVED },
      });
      if (approved >= this.cfg.autoApproveThreshold) {
        status = CommentStatus.APPROVED;
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId: input.postId,
        parentId: input.parentId ?? null,
        userId: input.userId ?? null,
        content: filteredContent,
        authorName: authorName ?? null,
        authorEmail: authorEmail ?? null,
        authorWebsite: authorWebsite ?? null,
        status,
        spamScore: spamResult.score,
        spamSignals: spamResult.signals,
        ipAddress: this.cfg.trackMetadata ? meta?.ipAddress : null,
        userAgent: this.cfg.trackMetadata ? meta?.userAgent : null,
      },
    });

    // Learning signal
    if (this.cfg.enableLearningSignals) {
      await this.prisma.learningSignal.create({
        data: {
          commentId: comment.id,
          action: status === CommentStatus.SPAM ? 'AUTO_SPAM' : 'SUBMITTED',
          metadata: { spamScore: spamResult.score, signals: spamResult.signals },
        },
      }).catch(() => { /* non-critical */ });
    }

    // Event
    const eventType = status === CommentStatus.APPROVED
      ? CommentEvent.AUTO_APPROVED
      : CommentEvent.CREATED;

    await this.events.emit(eventType, {
      commentId: comment.id,
      postId: comment.postId,
      userId: comment.userId ?? undefined,
      action: eventType,
      timestamp: new Date(),
      data: { status, spamScore: spamResult.score },
    });

    return comment as CommentData;
  }

  // ─── Read ────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<CommentData | null> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    return (comment as CommentData) ?? null;
  }

  async findByPost(
    postId: string,
    opts: { includeDeleted?: boolean; skip?: number; take?: number } = {},
  ): Promise<CommentData[]> {
    const where: Record<string, unknown> = { postId, parentId: null };
    if (!opts.includeDeleted) {
      where.deletedAt = null;
      where.status = CommentStatus.APPROVED;
    }

    const roots = await this.prisma.comment.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
      ...(opts.skip != null && { skip: opts.skip }),
      ...(opts.take != null && { take: opts.take }),
      include: {
        replies: {
          where: opts.includeDeleted ? {} : { deletedAt: null, status: CommentStatus.APPROVED },
          orderBy: { createdAt: 'asc' },
          include: {
            replies: {
              where: opts.includeDeleted ? {} : { deletedAt: null, status: CommentStatus.APPROVED },
              orderBy: { createdAt: 'asc' },
              include: {
                replies: {
                  where: opts.includeDeleted ? {} : { deletedAt: null, status: CommentStatus.APPROVED },
                  orderBy: { createdAt: 'asc' },
                  include: {
                    replies: {
                      where: opts.includeDeleted ? {} : { deletedAt: null, status: CommentStatus.APPROVED },
                      orderBy: { createdAt: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return roots as CommentData[];
  }

  async countByPost(postId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { postId, deletedAt: null, status: CommentStatus.APPROVED },
    });
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CommentData>> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({ where: { userId, deletedAt: null } }),
    ]);
    return {
      data: data as CommentData[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<CommentData>> {
    const sanitized = Sanitize.text(query);
    if (!sanitized) return { data: [], total: 0, page, limit, totalPages: 0 };

    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      OR: [
        { content: { contains: sanitized, mode: 'insensitive' as const } },
        { authorName: { contains: sanitized, mode: 'insensitive' as const } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: data as CommentData[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  async update(id: string, input: UpdateCommentInput, userId?: string): Promise<CommentData> {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new Error('Comment not found');
    if (existing.deletedAt) throw new Error('Cannot edit a deleted comment');
    if (userId && existing.userId !== userId) throw new Error('Not authorised to edit this comment');

    // Edit window enforcement
    if (this.cfg.editWindowMinutes > 0 && userId) {
      const editDeadline = new Date(
        (existing.createdAt as Date).getTime() + this.cfg.editWindowMinutes * 60 * 1000,
      );
      if (new Date() > editDeadline) {
        throw new Error(
          `Edit window of ${this.cfg.editWindowMinutes} minutes has expired`,
        );
      }
    }

    const content = Sanitize.html(input.content);
    const filteredContent = this.spam.filterProfanity(content);

    // Re-run spam check on edit
    const spamResult = this.spam.analyse(filteredContent, existing.authorName ?? undefined, existing.authorEmail ?? undefined);

    const updated = await this.prisma.comment.update({
      where: { id },
      data: {
        content: filteredContent,
        editedAt: new Date(),
        isEdited: true,
        status: spamResult.isSpam ? CommentStatus.SPAM : existing.status,
        spamScore: spamResult.score,
        spamSignals: spamResult.signals,
      },
    });

    await this.events.emit(CommentEvent.EDITED, {
      commentId: id,
      postId: updated.postId,
      userId: updated.userId ?? undefined,
      action: CommentEvent.EDITED,
      timestamp: new Date(),
    });

    return updated as CommentData;
  }

  // ─── Soft Delete ─────────────────────────────────────────────────────────

  async softDelete(id: string, userId?: string): Promise<CommentData> {
    const existing = await this.prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new Error('Comment not found');
    if (userId && existing.userId !== userId) throw new Error('Not authorised to delete this comment');

    const deleted = await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date(), status: CommentStatus.DELETED },
    });

    await this.events.emit(CommentEvent.DELETED, {
      commentId: id,
      postId: deleted.postId,
      userId: deleted.userId ?? undefined,
      action: CommentEvent.DELETED,
      timestamp: new Date(),
    });

    return deleted as CommentData;
  }

  // ─── Voting ──────────────────────────────────────────────────────────────

  async vote(commentId: string, input: VoteInput & { userId: string }): Promise<CommentData> {
    if (!this.cfg.enableVoting) throw new Error('Voting is disabled');

    // Deduplicate: one vote per user per comment
    const existingVote = await this.prisma.commentVote.findUnique({
      where: { commentId_visitorId: { commentId, visitorId: input.userId } },
    });

    if (existingVote) {
      if (existingVote.type === input.type) {
        throw new Error('Already voted');
      }
      // Flip vote: remove old, apply new
      await this.prisma.commentVote.delete({
        where: { commentId_visitorId: { commentId, visitorId: input.userId } },
      });
      const decrement = existingVote.type === VoteType.UP ? 'upvotes' : 'downvotes';
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { [decrement]: { decrement: 1 } },
      });
    }

    await this.prisma.commentVote.create({
      data: { commentId, visitorId: input.userId, type: input.type },
    });

    const field = input.type === VoteType.UP ? 'upvotes' : 'downvotes';
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { [field]: { increment: 1 } },
    });

    await this.events.emit(CommentEvent.VOTED, {
      commentId,
      postId: updated.postId,
      userId: input.userId,
      action: CommentEvent.VOTED,
      timestamp: new Date(),
      data: { voteType: input.type },
    });

    return updated as CommentData;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getDepth(parentId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = parentId;
    while (currentId) {
      const row: { parentId: string | null } | null = await this.prisma.comment.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!row) break;
      depth++;
      currentId = row.parentId;
    }
    return depth;
  }
}
