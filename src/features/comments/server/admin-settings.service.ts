// comments/admin-settings.service.ts
// DB-backed dynamic admin settings — fully configurable at runtime
// Same consumer-propagation pattern as tags/admin-settings.service.ts

import type {
  CommentsPrismaClient,
  CommentsConfig,
  CommentSystemSettings,
  CommentConfigConsumer,
  CommentStats,
} from '../types';
import { CommentStatus } from '../types';
import { DEFAULT_CONFIG } from './constants';
import { createLogger } from '@/server/observability/logger';

const logger = createLogger('comments/admin-settings');

export class CommentAdminSettingsService {
  private consumers: CommentConfigConsumer[] = [];
  private cached: CommentSystemSettings | null = null;

  constructor(private readonly prisma: CommentsPrismaClient) {}

  // ─── Consumer Registration ──────────────────────────────────────────────

  /**
   * Register a service to receive config updates when admin changes settings.
   * Call this during bootstrap for CommentService, ModerationService, SpamService.
   */
  registerConsumer(consumer: CommentConfigConsumer): void {
    this.consumers.push(consumer);
  }

  // ─── Read Settings ──────────────────────────────────────────────────────

  /** Get current settings (cached). Creates default row if none exists. */
  async getSettings(): Promise<CommentSystemSettings> {
    if (this.cached) return this.cached;
    return this.loadFromDb();
  }

  /** Force reload from DB — use after external DB changes */
  async reloadSettings(): Promise<CommentSystemSettings> {
    this.cached = null;
    const settings = await this.loadFromDb();
    await this.propagateConfig(settings);
    return settings;
  }

  // ─── Update Settings ────────────────────────────────────────────────────

  /**
   * Partial update — only send changed fields from admin panel.
   * Automatically propagates to all registered services.
   */
  async updateSettings(
    changes: Partial<Omit<CommentSystemSettings, 'id' | 'updatedAt'>>,
    updatedBy: string,
  ): Promise<CommentSystemSettings> {
    const current = await this.getSettings();

    const updated = await this.prisma.commentSettings.update({
      where: { id: current.id },
      data: {
        ...changes,
        updatedBy,
        updatedAt: new Date(),
      },
    });

    this.cached = updated as unknown as CommentSystemSettings;
    await this.propagateConfig(this.cached);
    return this.cached;
  }

  // ─── Admin Overview ─────────────────────────────────────────────────────

  /**
   * Combined settings + live stats for admin dashboard.
   * Single endpoint for the admin panel to hydrate.
   */
  async getAdminOverview(): Promise<{
    settings: CommentSystemSettings;
    stats: CommentStats & {
      recentFlagged: number;
      postsWithClosedComments: number;
      blockedEmailCount: number;
      blockedDomainCount: number;
      blockedIpCount: number;
      spamKeywordCount: number;
      profanityWordCount: number;
    };
  }> {
    const settings = await this.getSettings();

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      approved,
      pending,
      spam,
      flagged,
      deleted,
      pinned,
      resolved,
      todayCount,
      recentFlagged,
      avgSpamScore,
    ] = await Promise.all([
      this.prisma.comment.count(),
      this.prisma.comment.count({ where: { status: CommentStatus.APPROVED } }),
      this.prisma.comment.count({ where: { status: CommentStatus.PENDING } }),
      this.prisma.comment.count({ where: { status: CommentStatus.SPAM } }),
      this.prisma.comment.count({ where: { status: CommentStatus.FLAGGED } }),
      this.prisma.comment.count({ where: { deletedAt: { not: null } } }),
      this.prisma.comment.count({ where: { isPinned: true } }),
      this.prisma.comment.count({ where: { isResolved: true } }),
      this.prisma.comment.count({ where: { createdAt: { gte: oneDayAgo } } }),
      this.prisma.comment.count({ where: { status: CommentStatus.FLAGGED, createdAt: { gte: oneWeekAgo } } }),
      this.prisma.comment.aggregate({ _avg: { spamScore: true } }),
    ]);

    return {
      settings,
      stats: {
        total,
        approved,
        pending,
        spam,
        flagged,
        deleted,
        pinned,
        resolved,
        todayCount,
        recentFlagged,
        averageSpamScore: avgSpamScore._avg.spamScore ?? 0,
        blockedEmailCount: settings.blockedEmails.length,
        blockedDomainCount: settings.blockedDomains.length,
        blockedIpCount: settings.blockedIps.length,
        spamKeywordCount: settings.customSpamKeywords.length,
        profanityWordCount: settings.profanityWords.length,
        postsWithClosedComments: 0, // computed by caller if needed
      },
    };
  }

  // ─── Blocked Lists Management ───────────────────────────────────────────

  /** Add entries to a blocked list (emails, domains, or IPs) */
  async addToBlockedList(
    list: 'blockedEmails' | 'blockedDomains' | 'blockedIps',
    entries: string[],
    updatedBy: string,
  ): Promise<CommentSystemSettings> {
    const current = await this.getSettings();
    const existing = new Set(current[list]);
    for (const e of entries) existing.add(e.toLowerCase().trim());
    return this.updateSettings({ [list]: [...existing] }, updatedBy);
  }

  /** Remove entries from a blocked list */
  async removeFromBlockedList(
    list: 'blockedEmails' | 'blockedDomains' | 'blockedIps',
    entries: string[],
    updatedBy: string,
  ): Promise<CommentSystemSettings> {
    const current = await this.getSettings();
    const toRemove = new Set(entries.map((e) => e.toLowerCase().trim()));
    const filtered = current[list].filter((e) => !toRemove.has(e));
    return this.updateSettings({ [list]: filtered }, updatedBy);
  }

  // ─── Spam Keywords Management ───────────────────────────────────────────

  /** Add custom spam keywords */
  async addSpamKeywords(keywords: string[], updatedBy: string): Promise<CommentSystemSettings> {
    const current = await this.getSettings();
    const existing = new Set(current.customSpamKeywords);
    for (const kw of keywords) existing.add(kw.toLowerCase().trim());
    return this.updateSettings({ customSpamKeywords: [...existing] }, updatedBy);
  }

  /** Remove custom spam keywords */
  async removeSpamKeywords(keywords: string[], updatedBy: string): Promise<CommentSystemSettings> {
    const current = await this.getSettings();
    const toRemove = new Set(keywords.map((kw) => kw.toLowerCase().trim()));
    const filtered = current.customSpamKeywords.filter((kw) => !toRemove.has(kw));
    return this.updateSettings({ customSpamKeywords: filtered }, updatedBy);
  }

  // ─── Profanity Words Management ─────────────────────────────────────────

  /** Add profanity words */
  async addProfanityWords(words: string[], updatedBy: string): Promise<CommentSystemSettings> {
    const current = await this.getSettings();
    const existing = new Set(current.profanityWords);
    for (const w of words) existing.add(w.toLowerCase().trim());
    return this.updateSettings({ profanityWords: [...existing] }, updatedBy);
  }

  /** Remove profanity words */
  async removeProfanityWords(words: string[], updatedBy: string): Promise<CommentSystemSettings> {
    const current = await this.getSettings();
    const toRemove = new Set(words.map((w) => w.toLowerCase().trim()));
    const filtered = current.profanityWords.filter((w) => !toRemove.has(w));
    return this.updateSettings({ profanityWords: filtered }, updatedBy);
  }

  // ─── Auto-Close Check ───────────────────────────────────────────────────

  /**
   * Check if comments should be closed for a specific post.
   * Call this in your API route before allowing comment creation.
   */
  async isCommentingAllowed(postCreatedAt: Date): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const settings = await this.getSettings();

    if (!settings.commentsEnabled) {
      return { allowed: false, reason: 'Comments are globally disabled' };
    }

    if (settings.closeCommentsAfterDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - settings.closeCommentsAfterDays);
      if (postCreatedAt < cutoff) {
        return {
          allowed: false,
          reason: `Comments are closed on posts older than ${settings.closeCommentsAfterDays} days`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check rate limit for a user.
   * Returns { allowed, retryAfterMs } so the API can send Retry-After header.
   */
  async checkRateLimit(
    userId: string,
    postId?: string,
  ): Promise<{ allowed: boolean; reason?: string; retryAfterMs?: number }> {
    const settings = await this.getSettings();

    // Per-hour global limit
    if (settings.maxCommentsPerHour > 0) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await this.prisma.comment.count({
        where: { userId, createdAt: { gte: oneHourAgo } },
      });
      if (recentCount >= settings.maxCommentsPerHour) {
        return {
          allowed: false,
          reason: `Rate limit: max ${settings.maxCommentsPerHour} comments per hour`,
          retryAfterMs: 60 * 60 * 1000,
        };
      }
    }

    // Per-post per-user limit
    if (postId && settings.maxCommentsPerPostPerUser > 0) {
      const postCount = await this.prisma.comment.count({
        where: { userId, postId, deletedAt: null },
      });
      if (postCount >= settings.maxCommentsPerPostPerUser) {
        return {
          allowed: false,
          reason: `Max ${settings.maxCommentsPerPostPerUser} comments per post reached`,
        };
      }
    }

    return { allowed: true };
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private async loadFromDb(): Promise<CommentSystemSettings> {
    let row = await this.prisma.commentSettings.findFirst();

    if (!row) {
      row = await this.prisma.commentSettings.create({
        data: {
          maxContentLength: DEFAULT_CONFIG.maxContentLength,
          maxAuthorNameLength: DEFAULT_CONFIG.maxAuthorNameLength,
          maxWebsiteLength: DEFAULT_CONFIG.maxWebsiteLength,
          maxReplyDepth: DEFAULT_CONFIG.maxReplyDepth,
          commentsEnabled: DEFAULT_CONFIG.commentsEnabled,
          requireModeration: DEFAULT_CONFIG.requireModeration,
          allowGuestComments: DEFAULT_CONFIG.allowGuestComments,
          autoApproveThreshold: DEFAULT_CONFIG.autoApproveThreshold,
          editWindowMinutes: DEFAULT_CONFIG.editWindowMinutes,
          closeCommentsAfterDays: DEFAULT_CONFIG.closeCommentsAfterDays,
          maxCommentsPerPostPerUser: DEFAULT_CONFIG.maxCommentsPerPostPerUser,
          maxCommentsPerHour: DEFAULT_CONFIG.maxCommentsPerHour,
          maxLinksBeforeSpam: DEFAULT_CONFIG.maxLinksBeforeSpam,
          capsSpamRatio: DEFAULT_CONFIG.capsSpamRatio,
          capsCheckMinLength: DEFAULT_CONFIG.capsCheckMinLength,
          spamScoreThreshold: DEFAULT_CONFIG.spamScoreThreshold,
          customSpamKeywords: DEFAULT_CONFIG.customSpamKeywords,
          blockedEmails: DEFAULT_CONFIG.blockedEmails,
          blockedDomains: DEFAULT_CONFIG.blockedDomains,
          blockedIps: DEFAULT_CONFIG.blockedIps,
          enableVoting: DEFAULT_CONFIG.enableVoting,
          enableReactions: DEFAULT_CONFIG.enableReactions,
          enableThreading: DEFAULT_CONFIG.enableThreading,
          enableProfanityFilter: DEFAULT_CONFIG.enableProfanityFilter,
          enableLearningSignals: DEFAULT_CONFIG.enableLearningSignals,
          trackMetadata: DEFAULT_CONFIG.trackMetadata,
          profanityWords: DEFAULT_CONFIG.profanityWords,
          autoFlagThreshold: DEFAULT_CONFIG.autoFlagThreshold,
          pinnedCommentLimit: DEFAULT_CONFIG.pinnedCommentLimit,
          spamRetentionDays: DEFAULT_CONFIG.spamRetentionDays,
          deletedRetentionDays: DEFAULT_CONFIG.deletedRetentionDays,
          notifyOnFlag: DEFAULT_CONFIG.notifyOnFlag,
          notifyOnSpam: DEFAULT_CONFIG.notifyOnSpam,
        },
      });
    }

    this.cached = row as unknown as CommentSystemSettings;
    return this.cached;
  }

  private async propagateConfig(settings: CommentSystemSettings): Promise<void> {
    const cfg: Required<CommentsConfig> = {
      maxContentLength: settings.maxContentLength,
      maxAuthorNameLength: settings.maxAuthorNameLength,
      maxWebsiteLength: settings.maxWebsiteLength,
      maxReplyDepth: settings.maxReplyDepth,
      autoApproveThreshold: settings.autoApproveThreshold,
      customSpamKeywords: settings.customSpamKeywords,
      maxLinksBeforeSpam: settings.maxLinksBeforeSpam,
      capsSpamRatio: settings.capsSpamRatio,
      capsCheckMinLength: settings.capsCheckMinLength,
      trackMetadata: settings.trackMetadata,
      enableVoting: settings.enableVoting,
      enableReactions: settings.enableReactions,
      enableProfanityFilter: settings.enableProfanityFilter,
      profanityWords: settings.profanityWords,
      enableLearningSignals: settings.enableLearningSignals,
      spamRetentionDays: settings.spamRetentionDays,
      deletedRetentionDays: settings.deletedRetentionDays,
      commentsEnabled: settings.commentsEnabled,
      requireModeration: settings.requireModeration,
      allowGuestComments: settings.allowGuestComments,
      editWindowMinutes: settings.editWindowMinutes,
      closeCommentsAfterDays: settings.closeCommentsAfterDays,
      maxCommentsPerPostPerUser: settings.maxCommentsPerPostPerUser,
      maxCommentsPerHour: settings.maxCommentsPerHour,
      autoFlagThreshold: settings.autoFlagThreshold,
      spamScoreThreshold: settings.spamScoreThreshold,
      blockedEmails: settings.blockedEmails,
      blockedDomains: settings.blockedDomains,
      blockedIps: settings.blockedIps,
      enableThreading: settings.enableThreading,
      pinnedCommentLimit: settings.pinnedCommentLimit,
      notifyOnFlag: settings.notifyOnFlag,
      notifyOnSpam: settings.notifyOnSpam,
    };

    for (const consumer of this.consumers) {
      try {
        consumer.updateConfig(cfg);
      } catch (err) {
        logger.error('Config propagation error', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }
}
