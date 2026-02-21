// src/features/distribution/server/distribution.service.ts
import {
  SocialPlatform,
  DistributionStatus,
  DistributionEvent,
} from "../types";
import type {
  DistributionPrismaClient,
  DistributionConfig,
  PaginatedResult,
  DistributionRecordData,
  DistributionChannelData,
  PlatformCredentials,
  PostData,
  CreateChannelInput,
  UpdateChannelInput,
  QueryDistributionsInput,
  DistributePostInput,
  BulkDistributeInput,
  RetryDistributionInput,
  CancelDistributionInput,
} from "../types";
import type { DistributionEventBus } from "./events";
import { DEFAULT_CONFIG, VALID_STATUS_TRANSITIONS } from "./constants";
import { MessageBuilder } from "./message-builder";
import { getConnector } from "./connectors";

export class DistributionService {
  private prisma: DistributionPrismaClient;
  private eventBus: DistributionEventBus;
  private config: DistributionConfig;

  /** Circuit breaker state per platform — tracks consecutive failures */
  private circuitBreakers = new Map<
    string,
    { failures: number; lastFailure: number; open: boolean }
  >();
  /** Rate limit cooldowns per platform — timestamp when next request is allowed */
  private rateLimitCooldowns = new Map<string, number>();

  constructor(
    prisma: DistributionPrismaClient,
    eventBus: DistributionEventBus,
    config?: Partial<DistributionConfig>,
  ) {
    this.prisma = prisma;
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Circuit Breaker ──────────────────────────────────────────────────────

  private getCircuitBreaker(platform: string) {
    if (!this.circuitBreakers.has(platform)) {
      this.circuitBreakers.set(platform, {
        failures: 0,
        lastFailure: 0,
        open: false,
      });
    }
    return this.circuitBreakers.get(platform)!;
  }

  private isCircuitOpen(platform: string): boolean {
    const cb = this.getCircuitBreaker(platform);
    if (!cb.open) return false;
    // Half-open after 5 minutes — allow one retry
    const cooldownMs = 5 * 60 * 1000;
    if (Date.now() - cb.lastFailure > cooldownMs) {
      cb.open = false;
      return false;
    }
    return true;
  }

  private recordFailure(platform: string): void {
    const cb = this.getCircuitBreaker(platform);
    cb.failures++;
    cb.lastFailure = Date.now();
    if (cb.failures >= 5) cb.open = true;
  }

  private recordSuccess(platform: string): void {
    const cb = this.getCircuitBreaker(platform);
    cb.failures = 0;
    cb.open = false;
  }

  // ── Rate Limit Awareness ─────────────────────────────────────────────────

  private isRateLimited(platform: string): boolean {
    const cooldownUntil = this.rateLimitCooldowns.get(platform);
    if (!cooldownUntil) return false;
    if (Date.now() >= cooldownUntil) {
      this.rateLimitCooldowns.delete(platform);
      return false;
    }
    return true;
  }

  private setRateLimitCooldown(platform: string, retryAfterMs = 60_000): void {
    this.rateLimitCooldowns.set(platform, Date.now() + retryAfterMs);
  }

  // ── Retry with Exponential Backoff ───────────────────────────────────────

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    baseDelayMs: number,
    backoffMultiplier: number,
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError =
          err instanceof Error ? err : new Error("Unknown retry error");
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
          const jitter = Math.random() * delay * 0.3;
          await new Promise((r) => setTimeout(r, delay + jitter));
        }
      }
    }
    throw lastError;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return "Unknown error";
  }

  private isRateLimitError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      code === "RATE_LIMITED"
    );
  }

  // ── Health Check ─────────────────────────────────────────────────────────

  async healthCheck(): Promise<
    Record<
      string,
      { status: string; circuitOpen: boolean; rateLimited: boolean }
    >
  > {
    const platforms = [
      "twitter",
      "facebook",
      "linkedin",
      "telegram",
      "whatsapp",
      "pinterest",
      "reddit",
    ];
    const result: Record<
      string,
      { status: string; circuitOpen: boolean; rateLimited: boolean }
    > = {};

    for (const platform of platforms) {
      const circuitOpen = this.isCircuitOpen(platform);
      const rateLimited = this.isRateLimited(platform);
      const connector = getConnector(platform as SocialPlatform);

      let status = "unknown";
      if (!connector) status = "no_connector";
      else if (circuitOpen) status = "circuit_open";
      else if (rateLimited) status = "rate_limited";
      else status = "healthy";

      result[platform] = { status, circuitOpen, rateLimited };
    }

    return result;
  }

  // ── Channels ─────────────────────────────────────────────────────────────

  async getChannels(enabledOnly = false): Promise<DistributionChannelData[]> {
    const where = enabledOnly ? { enabled: true } : {};
    return this.prisma.distributionChannel.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async createChannel(
    input: CreateChannelInput,
  ): Promise<DistributionChannelData> {
    const channel = await this.prisma.distributionChannel.create({
      data: input,
    });
    await this.eventBus.emit(DistributionEvent.CHANNEL_CREATED, {
      channelId: channel.id,
    });
    return channel;
  }

  async getChannelById(id: string): Promise<DistributionChannelData | null> {
    return this.prisma.distributionChannel.findUnique({ where: { id } });
  }

  async updateChannel(
    id: string,
    input: UpdateChannelInput,
  ): Promise<DistributionChannelData> {
    const channel = await this.prisma.distributionChannel.update({
      where: { id },
      data: input,
    });
    await this.eventBus.emit(DistributionEvent.CHANNEL_UPDATED, {
      channelId: channel.id,
    });
    return channel;
  }

  async deleteChannel(id: string): Promise<void> {
    await this.prisma.distributionChannel.delete({ where: { id } });
    await this.eventBus.emit(DistributionEvent.CHANNEL_DELETED, {
      channelId: id,
    });
  }

  async validateChannelCredentials(
    id: string,
  ): Promise<{ valid: boolean; error?: string }> {
    const channel = await this.prisma.distributionChannel.findUnique({
      where: { id },
    });
    if (!channel) return { valid: false, error: "Channel not found" };

    const connector = getConnector(channel.platform as SocialPlatform);
    if (!connector)
      return { valid: false, error: `No connector for ${channel.platform}` };

    try {
      const valid = await connector.validateCredentials(
        channel.credentials as PlatformCredentials,
      );
      return { valid };
    } catch (err: unknown) {
      return { valid: false, error: this.getErrorMessage(err) };
    }
  }

  // ── Records / Distributions ──────────────────────────────────────────────

  async getDistributions(
    query: QueryDistributionsInput = {},
  ): Promise<PaginatedResult<DistributionRecordData>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.postId) where.postId = query.postId;
    if (query.platform) where.platform = query.platform;
    if (query.status) where.status = query.status;
    if (query.channelId) where.channelId = query.channelId;

    const [data, total] = await Promise.all([
      this.prisma.distributionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortOrder ?? "desc" },
        include: {
          post: { select: { title: true, slug: true } },
          channel: { select: { name: true, platform: true } },
        },
      }),
      this.prisma.distributionRecord.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getDistributionById(
    id: string,
  ): Promise<DistributionRecordData | null> {
    return this.prisma.distributionRecord.findUnique({
      where: { id },
      include: {
        post: { select: { title: true, slug: true } },
        channel: { select: { name: true, platform: true } },
      },
    });
  }

  async getPostDistributions(
    postId: string,
  ): Promise<DistributionRecordData[]> {
    return this.prisma.distributionRecord.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      include: { channel: { select: { name: true, platform: true } } },
    });
  }

  // ── Distribute ───────────────────────────────────────────────────────────

  async distributePost(
    input: DistributePostInput,
  ): Promise<DistributionRecordData[]> {
    const post = (await this.prisma.post.findUnique({
      where: { id: input.postId },
    })) as PostData | null;
    if (!post) throw new Error("Post not found");

    const results: DistributionRecordData[] = [];
    for (const platform of input.platforms) {
      // ── Pre-flight checks ──
      if (this.isCircuitOpen(platform)) {
        const record = await this.prisma.distributionRecord.create({
          data: {
            postId: input.postId,
            channelId: null,
            platform,
            status: DistributionStatus.FAILED,
            content: "",
            error: `Circuit breaker open for ${platform} — too many consecutive failures`,
            maxRetries: 0,
          },
        });
        results.push(record);
        continue;
      }

      if (this.isRateLimited(platform)) {
        const record = await this.prisma.distributionRecord.create({
          data: {
            postId: input.postId,
            channelId: null,
            platform,
            status: DistributionStatus.RATE_LIMITED,
            content: "",
            error: `Rate limited — cooldown active for ${platform}`,
            maxRetries: this.config.maxRetries ?? 3,
          },
        });
        results.push(record);
        continue;
      }

      const message = MessageBuilder.build({
        post: post,
        platform,
        style: input.style,
        overrideMessage: input.messageOverride,
        siteBaseUrl: this.config.siteBaseUrl,
        utmSource: this.config.utmSource,
      });

      const channel = (await this.prisma.distributionChannel.findFirst({
        where: { platform, enabled: true },
      })) as DistributionChannelData | null;

      const status = input.scheduledFor
        ? DistributionStatus.SCHEDULED
        : DistributionStatus.PENDING;

      const record = await this.prisma.distributionRecord.create({
        data: {
          postId: input.postId,
          channelId: channel?.id ?? null,
          platform,
          status,
          content: message.text,
          scheduledFor: input.scheduledFor ?? null,
          maxRetries: this.config.maxRetries ?? 3,
        },
      });

      if (!input.scheduledFor) {
        const connector = getConnector(platform as SocialPlatform);
        if (connector && channel) {
          try {
            await this.prisma.distributionRecord.update({
              where: { id: record.id },
              data: { status: DistributionStatus.PUBLISHING },
            });

            // Use retry with exponential backoff
            const result = await this.withRetry(
              () =>
                connector.post(
                  { text: message.text, url: message.url, title: post.title },
                  channel.credentials as PlatformCredentials,
                ),
              this.config.maxRetries ?? 3,
              this.config.retryDelayMs ?? 5_000,
              this.config.retryBackoffMultiplier ?? 2,
            );

            if (result.success) {
              const publishedAt = new Date();
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: {
                  status: DistributionStatus.PUBLISHED,
                  externalId: result.externalId,
                  externalUrl: result.externalUrl,
                  publishedAt,
                },
              });
              // Update channel's lastPublishedAt
              if (channel?.id) {
                await this.prisma.distributionChannel
                  .update({
                    where: { id: channel.id },
                    data: { lastPublishedAt: publishedAt },
                  })
                  .catch(() => {
                    /* non-critical */
                  });
              }
              this.recordSuccess(platform);
            } else {
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: {
                  status: DistributionStatus.FAILED,
                  error: result.error,
                },
              });
              this.recordFailure(platform);
            }
          } catch (err: unknown) {
            const isRateLimit = this.isRateLimitError(err);
            const message = this.getErrorMessage(err);

            if (isRateLimit) {
              this.setRateLimitCooldown(platform);
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: {
                  status: DistributionStatus.RATE_LIMITED,
                  error: `Rate limited: ${message}`,
                },
              });
            } else {
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: { status: DistributionStatus.FAILED, error: message },
              });
            }
            this.recordFailure(platform);
          }
        }
      }

      // Re-fetch to return the latest state after updates
      const finalRecord = await this.prisma.distributionRecord.findUnique({
        where: { id: record.id },
      });
      results.push(finalRecord ?? record);
    }

    await this.eventBus.emit(DistributionEvent.DISTRIBUTED, {
      postId: input.postId,
      platforms: input.platforms,
    });
    return results;
  }

  async bulkDistribute(
    input: BulkDistributeInput,
  ): Promise<{ total: number; created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    for (const postId of input.postIds) {
      try {
        await this.distributePost({ ...input, postId });
        created++;
      } catch (err: unknown) {
        errors.push(`Post ${postId}: ${this.getErrorMessage(err)}`);
      }
    }

    await this.eventBus.emit(DistributionEvent.BULK_DISTRIBUTED, {
      total: input.postIds.length,
      created,
    });
    return { total: input.postIds.length, created, errors };
  }

  async retryDistribution(
    input: RetryDistributionInput,
  ): Promise<DistributionRecordData> {
    const record = await this.prisma.distributionRecord.findUnique({
      where: { id: input.recordId },
    });
    if (!record) throw new Error("Distribution record not found");

    const allowed = VALID_STATUS_TRANSITIONS[record.status];
    if (!allowed?.includes(DistributionStatus.PENDING)) {
      throw new Error(`Cannot retry from status ${record.status}`);
    }

    // Guard: do not allow retries beyond maxRetries
    const maxRetries = record.maxRetries ?? this.config.maxRetries ?? 3;
    if ((record.retryCount ?? 0) >= maxRetries) {
      throw new Error(
        `Maximum retries (${maxRetries}) reached for this distribution record`,
      );
    }

    const updated = await this.prisma.distributionRecord.update({
      where: { id: input.recordId },
      data: {
        status: DistributionStatus.PENDING,
        error: null,
        retryCount: (record.retryCount ?? 0) + 1,
      },
    });

    await this.eventBus.emit(DistributionEvent.RETRIED, {
      recordId: input.recordId,
    });

    // Re-execute the distribution
    // The record is set to PENDING. Attempt re-distribution inline by looking
    // up the record's post and platform and calling the connector directly.
    // If this fails the record stays PENDING and will be picked up by
    // processScheduledDistributions on the next cron run.
    try {
      const fresh = (await this.prisma.distributionRecord.findUnique({
        where: { id: record.id },
        include: { channel: true },
      })) as
        | (DistributionRecordData & {
            channel?: DistributionChannelData | null;
          })
        | null;
      if (fresh) {
        const connector = getConnector(fresh.platform as SocialPlatform);
        const channel = fresh.channel;
        if (connector && channel) {
          await this.prisma.distributionRecord.update({
            where: { id: record.id },
            data: { status: DistributionStatus.PUBLISHING },
          });

          const post = (await this.prisma.post.findUnique({
            where: { id: fresh.postId },
          })) as PostData | null;
          const postUrl =
            post && post.slug
              ? `${this.config.siteBaseUrl ?? ""}/blog/${post.slug}`
              : "";
          const result = await this.withRetry(
            () =>
              connector.post(
                { text: fresh.content, url: postUrl, title: post?.title ?? "" },
                channel.credentials as PlatformCredentials,
              ),
            this.config.maxRetries ?? 3,
            this.config.retryDelayMs ?? 5_000,
            this.config.retryBackoffMultiplier ?? 2,
          );

          if (result.success) {
            const publishedAt = new Date();
            await this.prisma.distributionRecord.update({
              where: { id: record.id },
              data: {
                status: DistributionStatus.PUBLISHED,
                externalId: result.externalId,
                externalUrl: result.externalUrl,
                publishedAt,
              },
            });
            // Update channel's lastPublishedAt on retry success
            if (channel?.id) {
              await this.prisma.distributionChannel
                .update({
                  where: { id: channel.id },
                  data: { lastPublishedAt: publishedAt },
                })
                .catch(() => {
                  /* non-critical */
                });
            }
            this.recordSuccess(fresh.platform);
          } else {
            await this.prisma.distributionRecord.update({
              where: { id: record.id },
              data: { status: DistributionStatus.FAILED, error: result.error },
            });
            this.recordFailure(fresh.platform);
          }
        }
      }
    } catch (retryErr: unknown) {
      console.warn(
        "[DistributionService] Retry execution failed, will be picked up by scheduler",
        { id: record.id, error: this.getErrorMessage(retryErr) },
      );
    }

    // Re-fetch the latest state after retry attempt
    const finalRecord = await this.prisma.distributionRecord.findUnique({
      where: { id: record.id },
    });
    return finalRecord ?? updated;
  }

  async cancelDistribution(
    input: CancelDistributionInput,
  ): Promise<DistributionRecordData> {
    const record = await this.prisma.distributionRecord.findUnique({
      where: { id: input.recordId },
    });
    if (!record) throw new Error("Distribution record not found");

    const allowed = VALID_STATUS_TRANSITIONS[record.status];
    if (!allowed?.includes(DistributionStatus.CANCELLED)) {
      throw new Error(`Cannot cancel from status ${record.status}`);
    }

    const updated = await this.prisma.distributionRecord.update({
      where: { id: input.recordId },
      data: { status: DistributionStatus.CANCELLED },
    });

    await this.eventBus.emit(DistributionEvent.CANCELLED, {
      recordId: input.recordId,
    });
    return updated;
  }

  // ── Stats & Config ───────────────────────────────────────────────────────

  async getStats(): Promise<{
    records: {
      total: number;
      published: number;
      failed: number;
      pending: number;
      scheduled: number;
      rateLimited: number;
    };
    channels: { total: number; active: number };
    config: DistributionConfig;
    successRate: number;
    platformHealth: Record<
      string,
      { status: string; circuitOpen: boolean; rateLimited: boolean }
    >;
  }> {
    const [total, published, failed, pending, scheduled, rateLimited] =
      await Promise.all([
        this.prisma.distributionRecord.count(),
        this.prisma.distributionRecord.count({
          where: { status: DistributionStatus.PUBLISHED },
        }),
        this.prisma.distributionRecord.count({
          where: { status: DistributionStatus.FAILED },
        }),
        this.prisma.distributionRecord.count({
          where: { status: DistributionStatus.PENDING },
        }),
        this.prisma.distributionRecord.count({
          where: { status: DistributionStatus.SCHEDULED },
        }),
        this.prisma.distributionRecord.count({
          where: { status: DistributionStatus.RATE_LIMITED },
        }),
      ]);

    const channels = await this.prisma.distributionChannel.count();
    const activeChannels = await this.prisma.distributionChannel.count({
      where: { enabled: true },
    });

    // Success rate
    const completedTotal = published + failed;
    const successRate =
      completedTotal > 0 ? Math.round((published / completedTotal) * 100) : 0;

    // Platform health
    const platformHealth = await this.healthCheck();

    return {
      records: { total, published, failed, pending, scheduled, rateLimited },
      channels: { total: channels, active: activeChannels },
      config: this.config,
      successRate,
      platformHealth,
    };
  }

  async updateConfig(
    input: Partial<DistributionConfig>,
  ): Promise<DistributionConfig> {
    this.config = { ...this.config, ...input };

    // DIST-001: Persist to DB via SiteSettings.distributionConfig JSON column
    try {
      const existing = await this.prisma.siteSettings.findFirst();
      if (existing) {
        await this.prisma.siteSettings.update({
          where: { id: existing.id },
          data: { distributionConfig: this.config },
        });
      }
    } catch {
      // Non-critical: in-memory config still updated
      console.warn(
        "[DistributionService] Failed to persist config to DB — distributionConfig column may not exist yet",
      );
    }

    await this.eventBus.emit(DistributionEvent.SETTINGS_UPDATED, {
      config: this.config,
    });
    return this.config;
  }

  /** Load config from DB on first use (lazy initialization). */
  async loadConfigFromDb(): Promise<void> {
    try {
      const settings = await this.prisma.siteSettings.findFirst({
        select: { distributionConfig: true },
      });
      if (
        settings?.distributionConfig &&
        typeof settings.distributionConfig === "object"
      ) {
        this.config = { ...DEFAULT_CONFIG, ...settings.distributionConfig };
      }
    } catch {
      // distributionConfig column may not exist yet — use in-memory defaults
    }
  }

  // ── Scheduled Processing ─────────────────────────────────────────────────

  async processScheduledDistributions(): Promise<{
    processed: number;
    sent: number;
    errors: string[];
  }> {
    const now = new Date();
    const scheduled = (await this.prisma.distributionRecord.findMany({
      where: {
        status: DistributionStatus.SCHEDULED,
        scheduledFor: { lte: now },
      },
      take: this.config.scheduledBatchSize ?? 50,
      include: { channel: true },
    })) as (DistributionRecordData & {
      channel?: DistributionChannelData | null;
    })[];

    let processed = 0;
    let sent = 0;
    const errors: string[] = [];

    for (const record of scheduled) {
      try {
        // Skip if circuit breaker is open for this platform
        if (this.isCircuitOpen(record.platform)) {
          errors.push(
            `Record ${record.id}: Circuit open for ${record.platform}`,
          );
          continue;
        }

        // Skip if rate limited
        if (this.isRateLimited(record.platform)) {
          await this.prisma.distributionRecord.update({
            where: { id: record.id },
            data: {
              status: DistributionStatus.RATE_LIMITED,
              error: "Rate limited during batch processing",
            },
          });
          continue;
        }

        await this.prisma.distributionRecord.update({
          where: { id: record.id },
          data: { status: DistributionStatus.PUBLISHING },
        });

        const connector = getConnector(record.platform as SocialPlatform);
        const channel = record.channel;

        if (connector && channel) {
          try {
            const post = (await this.prisma.post.findUnique({
              where: { id: record.postId },
            })) as PostData | null;
            const result = await this.withRetry(
              () =>
                connector.post(
                  { text: record.content, url: "", title: post?.title ?? "" },
                  channel.credentials as PlatformCredentials,
                ),
              2, // fewer retries for batch processing
              this.config.retryDelayMs ?? 5_000,
              this.config.retryBackoffMultiplier ?? 2,
            );

            if (result.success) {
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: {
                  status: DistributionStatus.PUBLISHED,
                  externalId: result.externalId,
                  externalUrl: result.externalUrl,
                  publishedAt: new Date(),
                },
              });
              this.recordSuccess(record.platform);
              sent++;
            } else {
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: {
                  status: DistributionStatus.FAILED,
                  error: result.error,
                },
              });
              this.recordFailure(record.platform);
            }
          } catch (err: unknown) {
            const isRateLimit = this.isRateLimitError(err);
            const message = this.getErrorMessage(err);
            if (isRateLimit) {
              this.setRateLimitCooldown(record.platform);
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: {
                  status: DistributionStatus.RATE_LIMITED,
                  error: message,
                },
              });
            } else {
              await this.prisma.distributionRecord.update({
                where: { id: record.id },
                data: { status: DistributionStatus.FAILED, error: message },
              });
            }
            this.recordFailure(record.platform);
            errors.push(`Record ${record.id}: ${message}`);
          }
        } else {
          // No connector or channel available — mark as failed
          await this.prisma.distributionRecord.update({
            where: { id: record.id },
            data: {
              status: DistributionStatus.FAILED,
              error: `No connector or channel available for platform ${record.platform}`,
            },
          });
        }

        processed++;
      } catch (err: unknown) {
        errors.push(`Record ${record.id}: ${this.getErrorMessage(err)}`);
      }
    }

    return { processed, sent, errors };
  }

  async cleanupOldRecords(): Promise<number> {
    const cutoff = new Date(
      Date.now() - (this.config.retentionDays ?? 90) * 86_400_000,
    );
    const result = await this.prisma.distributionRecord.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        status: {
          in: [DistributionStatus.PUBLISHED, DistributionStatus.CANCELLED],
        },
      },
    });
    return result.count ?? 0;
  }
}
