// comments/moderation.service.ts
// Admin moderation: approve, reject, flag, pin, resolve, bulk ops, purge
// Pure TS + Prisma — no framework dependency

import type {
  CommentsPrismaClient,
  CommentsConfig,
  CommentData,
  CommentStats,
  PaginatedResult,
  QueryCommentsInput,
  CommentConfigConsumer,
} from '../types';
import { CommentStatus, CommentEvent, CommentSortField } from '../types';
import { DEFAULT_CONFIG } from './constants';
import { CommentEventBus } from './events';

export class ModerationService implements CommentConfigConsumer {
  private cfg: Required<CommentsConfig>;

  constructor(
    private readonly prisma: CommentsPrismaClient,
    private readonly events: CommentEventBus,
    config: Partial<CommentsConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  /** Called by AdminSettingsService when admin changes settings */
  updateConfig(cfg: Required<CommentsConfig>): void {
    this.cfg = { ...cfg };
  }

  // ─── Query (admin panel) ─────────────────────────────────────────────────

  async findAll(query: QueryCommentsInput): Promise<PaginatedResult<CommentData>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.postId) where.postId = query.postId;
    if (query.userId) where.userId = query.userId;
    if (query.isPinned !== undefined) where.isPinned = query.isPinned;
    if (query.isResolved !== undefined) where.isResolved = query.isResolved;
    if (query.search) {
      where.OR = [
        { content: { contains: query.search, mode: 'insensitive' } },
        { authorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sortBy ?? CommentSortField.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortField]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.comment.findMany({ where, orderBy, skip, take: limit }),
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

  // ─── Stats ───────────────────────────────────────────────────────────────

  async getStats(): Promise<CommentStats> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, approved, pending, spam, flagged, deleted, pinned, resolved, todayCount, avgSpamScore] =
      await Promise.all([
        this.prisma.comment.count(),
        this.prisma.comment.count({ where: { status: CommentStatus.APPROVED } }),
        this.prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
        this.prisma.comment.count({ where: { status: CommentStatus.SPAM } }),
        this.prisma.comment.count({ where: { status: CommentStatus.FLAGGED } }),
        this.prisma.comment.count({ where: { deletedAt: { not: null } } }),
        this.prisma.comment.count({ where: { isPinned: true } }),
        this.prisma.comment.count({ where: { isResolved: true } }),
        this.prisma.comment.count({ where: { createdAt: { gte: oneDayAgo } } }),
        this.prisma.comment.aggregate({ _avg: { spamScore: true } }),
      ]);

    return {
      total,
      approved,
      pending,
      spam,
      flagged,
      deleted,
      pinned,
      resolved,
      todayCount,
      averageSpamScore: avgSpamScore._avg.spamScore ?? 0,
    };
  }

  // ─── Single-item actions ─────────────────────────────────────────────────

  async approve(id: string, moderatorId: string): Promise<CommentData> {
    return this.setStatus(id, CommentStatus.APPROVED, moderatorId, CommentEvent.APPROVED);
  }

  async reject(id: string, moderatorId: string): Promise<CommentData> {
    return this.setStatus(id, CommentStatus.REJECTED, moderatorId, CommentEvent.REJECTED);
  }

  async markAsSpam(id: string, moderatorId: string): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { status: CommentStatus.SPAM, spamScore: 1.0 },
    });
    if (this.cfg.enableLearningSignals) {
      await this.prisma.learningSignal.create({
        data: { commentId: id, action: 'MANUAL_SPAM', metadata: { moderatorId } },
      }).catch(() => {});
    }
    await this.emitEvent(CommentEvent.SPAM_DETECTED, comment, moderatorId);
    return comment as CommentData;
  }

  async bulkMarkAsSpam(ids: string[], moderatorId: string): Promise<number> {
    const result = await this.prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { status: CommentStatus.SPAM, spamScore: 1.0 },
    });
    if (this.cfg.enableLearningSignals) {
      for (const id of ids) {
        await this.prisma.learningSignal.create({
          data: { commentId: id, action: 'MANUAL_SPAM_BULK', metadata: { moderatorId } },
        }).catch(() => {});
      }
    }
    return result.count;
  }

  async flag(id: string, reason: string, userId: string): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: {
        status: CommentStatus.FLAGGED,
        flagCount: { increment: 1 },
        flagReasons: { push: reason },
      },
    });

    // Auto-hide when flag count exceeds threshold
    if (
      this.cfg.autoFlagThreshold > 0 &&
      (comment.flagCount as number) >= this.cfg.autoFlagThreshold &&
      comment.status !== CommentStatus.REJECTED
    ) {
      await this.prisma.comment.update({
        where: { id },
        data: { status: CommentStatus.REJECTED },
      });
    }

    await this.emitEvent(CommentEvent.FLAGGED, comment, userId, { reason });
    return comment as CommentData;
  }

  async unflag(id: string, moderatorId: string): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { status: CommentStatus.APPROVED, flagCount: 0, flagReasons: [] },
    });

    await this.emitEvent(CommentEvent.UNFLAGGED, comment, moderatorId);
    return comment as CommentData;
  }

  async pin(id: string, pinned: boolean, moderatorId: string): Promise<CommentData> {
    // Enforce pinned limit when pinning
    if (pinned && this.cfg.pinnedCommentLimit > 0) {
      const target = await this.prisma.comment.findUnique({ where: { id }, select: { postId: true } });
      if (target) {
        const pinnedCount = await this.prisma.comment.count({
          where: { postId: target.postId, isPinned: true },
        });
        if (pinnedCount >= this.cfg.pinnedCommentLimit) {
          throw new Error(
            `Max ${this.cfg.pinnedCommentLimit} pinned comments per post reached`,
          );
        }
      }
    }

    const comment = await this.prisma.comment.update({
      where: { id },
      data: { isPinned: pinned },
    });

    const event = pinned ? CommentEvent.PINNED : CommentEvent.UNPINNED;
    await this.emitEvent(event, comment, moderatorId);
    return comment as CommentData;
  }

  async resolve(id: string, resolved: boolean, moderatorId: string): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { isResolved: resolved },
    });

    const event = resolved ? CommentEvent.RESOLVED : CommentEvent.UNRESOLVED;
    await this.emitEvent(event, comment, moderatorId);
    return comment as CommentData;
  }

  async restore(id: string, moderatorId: string): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: null, status: CommentStatus.PENDING },
    });

    await this.emitEvent(CommentEvent.RESTORED, comment, moderatorId);
    return comment as CommentData;
  }

  async hardDelete(id: string): Promise<void> {
    // Remove votes first
    await this.prisma.commentVote.deleteMany({ where: { commentId: id } });
    await this.prisma.learningSignal.deleteMany({ where: { commentId: id } });
    await this.prisma.comment.delete({ where: { id } });
  }

  // ─── Bulk ops ────────────────────────────────────────────────────────────

  async bulkApprove(ids: string[], moderatorId: string): Promise<number> {
    return this.bulkStatus(ids, CommentStatus.APPROVED, moderatorId, CommentEvent.APPROVED);
  }

  async bulkReject(ids: string[], moderatorId: string): Promise<number> {
    return this.bulkStatus(ids, CommentStatus.REJECTED, moderatorId, CommentEvent.REJECTED);
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await this.prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), status: CommentStatus.DELETED },
    });
    return result.count;
  }

  async bulkPin(ids: string[], pinned: boolean, moderatorId: string): Promise<number> {
    const result = await this.prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { isPinned: pinned },
    });

    const event = pinned ? CommentEvent.PINNED : CommentEvent.UNPINNED;
    for (const id of ids) {
      await this.events.emit(event, {
        commentId: id, postId: '', userId: moderatorId,
        action: event, timestamp: new Date(),
      });
    }
    return result.count;
  }

  async bulkResolve(ids: string[], resolved: boolean, moderatorId: string): Promise<number> {
    const result = await this.prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { isResolved: resolved },
    });

    const event = resolved ? CommentEvent.RESOLVED : CommentEvent.UNRESOLVED;
    for (const id of ids) {
      await this.events.emit(event, {
        commentId: id, postId: '', userId: moderatorId,
        action: event, timestamp: new Date(),
      });
    }
    return result.count;
  }

  // ─── Maintenance ─────────────────────────────────────────────────────────

  async purgeOldSpam(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.cfg.spamRetentionDays);

    // Remove related records first
    const spamIds = await this.prisma.comment.findMany({
      where: { status: CommentStatus.SPAM, createdAt: { lt: cutoff } },
      select: { id: true },
    });
    const ids = spamIds.map((c: { id: string }) => c.id);
    if (ids.length === 0) return 0;

    await this.prisma.commentVote.deleteMany({ where: { commentId: { in: ids } } });
    await this.prisma.learningSignal.deleteMany({ where: { commentId: { in: ids } } });
    const result = await this.prisma.comment.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  async purgeDeleted(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.cfg.deletedRetentionDays);

    const deletedIds = await this.prisma.comment.findMany({
      where: { deletedAt: { not: null, lt: cutoff } },
      select: { id: true },
    });
    const ids = deletedIds.map((c: { id: string }) => c.id);
    if (ids.length === 0) return 0;

    await this.prisma.commentVote.deleteMany({ where: { commentId: { in: ids } } });
    await this.prisma.learningSignal.deleteMany({ where: { commentId: { in: ids } } });
    const result = await this.prisma.comment.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private async setStatus(
    id: string,
    status: CommentStatus,
    moderatorId: string,
    event: CommentEvent,
  ): Promise<CommentData> {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: { status },
    });

    if (this.cfg.enableLearningSignals) {
      await this.prisma.learningSignal.create({
        data: { commentId: id, action: status, metadata: { moderatorId } },
      }).catch(() => {});
    }

    await this.emitEvent(event, comment, moderatorId);
    return comment as CommentData;
  }

  private async bulkStatus(
    ids: string[],
    status: CommentStatus,
    moderatorId: string,
    event: CommentEvent,
  ): Promise<number> {
    const result = await this.prisma.comment.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    for (const id of ids) {
      await this.events.emit(event, {
        commentId: id, postId: '', userId: moderatorId,
        action: event, timestamp: new Date(),
      });
    }
    return result.count;
  }

  private async emitEvent(
    event: CommentEvent,
    comment: Record<string, unknown>,
    userId: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.events.emit(event, {
      commentId: comment.id as string,
      postId: comment.postId as string,
      userId,
      action: event,
      timestamp: new Date(),
      data,
    });
  }
}
