/**
 * ============================================================================
 * Cron Job Endpoint — /api/cron
 * ============================================================================
 * Runs periodic cleanup tasks. Designed to be invoked by Vercel Cron or
 * an external scheduler (e.g. every hour).
 *
 * Authorization: Bearer token must match the CRON_SECRET env variable.
 *
 * Kill-switch behaviour:
 *   • Each task checks its corresponding feature kill switch before running.
 *   • If a feature is disabled in SiteSettings, the task is skipped.
 *   • If CRON_SECRET is not configured, the endpoint returns 503.
 *
 * Safety features:
 *   • Distributed lock prevents concurrent execution (via CronLock table).
 *   • Per-task timeout prevents a single task from hanging the entire run.
 *   • Every run is persisted to the CronLog table for auditing.
 *   • Structured logging via the observability logger.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";
import { createLogger } from "@/server/observability/logger";
import {
  prisma,
  blogService,
  pageService,
  tagService,
  seoService,
  mediaService,
  moderationService,
  captchaAdminSettings,
  distributionService,
  siteSettingsService,
} from "@/server/wiring";
import { sendTransactionalEmail } from "@/server/mail";
import { syncAdSlotPageTypes } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import { InterlinkService } from "@/features/seo/server/interlink.service";
import type { InterlinkPrisma } from "@/features/seo/server/interlink.service";
import { processJobBatch } from "@/features/jobs/server/runner";
import type { Prisma } from "@prisma/client";

const logger = createLogger("cron");

const scanPrisma: ScanPrisma = {
  category: { findMany: (args) => prisma.category.findMany(args as never) },
  tag: { findMany: (args) => prisma.tag.findMany(args as never) },
  page: { findMany: (args) => prisma.page.findMany(args as never) },
  post: {
    count: (args) => prisma.post.count(args as never),
    findMany: (args) => prisma.post.findMany(args as never),
  },
  adSlot: {
    findMany: (args) => prisma.adSlot.findMany(args as never),
    update: (args) => prisma.adSlot.update(args as never),
  },
};

const interlinkPrisma: InterlinkPrisma = {
  post: {
    findMany: (args) => prisma.post.findMany(args as never),
    findUnique: (args) => prisma.post.findUnique(args as never),
    update: (args) => prisma.post.update(args as never),
    count: (args) => prisma.post.count(args as never),
  },
  page: {
    findMany: (args) => prisma.page.findMany(args as never),
    findUnique: (args) => prisma.page.findUnique(args as never),
    update: (args) => prisma.page.update(args as never),
    count: (args) => prisma.page.count(args as never),
  },
  internalLink: {
    findMany: (args) => prisma.internalLink.findMany(args as never),
    findFirst: (args) => prisma.internalLink.findFirst(args as never),
    findUnique: (args) => prisma.internalLink.findUnique(args as never),
    create: (args) => prisma.internalLink.create(args as never),
    update: (args) => prisma.internalLink.update(args as never),
    updateMany: (args) => prisma.internalLink.updateMany(args as never),
    delete: (args) => prisma.internalLink.delete(args as never),
    deleteMany: (args) => prisma.internalLink.deleteMany(args as never),
    count: (args) => prisma.internalLink.count(args as never),
    upsert: (args) => prisma.internalLink.upsert(args as never),
  },
  interlinkExclusion: {
    findMany: (args) => prisma.interlinkExclusion.findMany(args as never),
    create: (args) => prisma.interlinkExclusion.create(args as never),
    delete: (args) => prisma.interlinkExclusion.delete(args as never),
    deleteMany: (args) => prisma.interlinkExclusion.deleteMany(args as never),
    count: (args) => prisma.interlinkExclusion.count(args as never),
  },
};

// ─── HTML escape for digest emails ──────────────────────────────────────────
function escapeHtmlForDigest(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Per-task timeout in milliseconds (30 s). */
const TASK_TIMEOUT_MS = 30_000;

/** Global lock TTL in seconds (5 min — generous for slow DBs). */
const LOCK_TTL_SECONDS = 300;

// ─── Types ──────────────────────────────────────────────────────────────────

interface TaskResult {
  task: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  duration?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getSiteSettings() {
  const settings = await prisma.siteSettings.findFirst();
  return settings ?? {};
}

/**
 * Run a single task with a timeout.  If the task exceeds TASK_TIMEOUT_MS it is
 * aborted and recorded as an error.
 */
async function runTask(
  name: string,
  enabled: boolean,
  fn: () => Promise<void>,
): Promise<TaskResult> {
  if (!enabled) {
    return { task: name, status: "skipped", reason: "kill-switch off" };
  }
  const start = Date.now();
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task timed out after ${TASK_TIMEOUT_MS}ms`)),
          TASK_TIMEOUT_MS,
        ),
      ),
    ]);
    const duration = Date.now() - start;
    logger.info(`Task ${name} completed`, { task: name, duration });
    return { task: name, status: "ok", duration };
  } catch (err) {
    const duration = Date.now() - start;
    const reason = err instanceof Error ? err.message : String(err);
    logger.error(`Task ${name} failed`, { task: name, duration, reason });
    return { task: name, status: "error", reason, duration };
  }
}

// ─── Distributed Lock ───────────────────────────────────────────────────────

function generateNonce() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Attempt to acquire the global cron lock.  Returns the holder nonce on
 * success, or `null` if another execution is already running.
 */
async function acquireLock(): Promise<string | null> {
  const holder = generateNonce();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000);

  try {
    // Delete any expired locks first
    await prisma.cronLock.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Try to create — unique constraint on id will reject if already held
    await prisma.cronLock.create({
      data: { id: "cron-global", lockedAt: now, expiresAt, holder },
    });
    return holder;
  } catch {
    // Lock already held
    return null;
  }
}

async function releaseLock(holder: string): Promise<void> {
  try {
    await prisma.cronLock.deleteMany({
      where: { id: "cron-global", holder },
    });
  } catch {
    // best-effort
  }
}

// ─── Persist Run to CronLog ────────────────────────────────────────────────

async function persistLog(
  results: TaskResult[],
  summary: { ok: number; skipped: number; errors: number },
  durationMs: number,
  triggeredBy: "scheduler" | "manual",
) {
  try {
    const status =
      summary.errors === 0 ? "ok" : summary.ok > 0 ? "partial" : "error";
    const jsonResults = results.map((result) => ({
      task: result.task,
      status: result.status,
      ...(result.reason !== undefined ? { reason: result.reason } : {}),
      ...(result.duration !== undefined ? { duration: result.duration } : {}),
    }));
    await prisma.cronLog.create({
      data: {
        status,
        summary,
        results: jsonResults as Prisma.InputJsonValue,
        durationMs,
        triggeredBy,
      },
    });
  } catch (err) {
    logger.error("Failed to persist cron log", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Verify CRON_SECRET is configured
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  // 2. Authenticate request
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== env.CRON_SECRET) {
    logger.warn("Unauthorized cron attempt", {
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine trigger source
  const triggeredBy =
    request.headers.get("x-cron-trigger") === "manual" ? "manual" : "scheduler";

  // 3. Acquire distributed lock — prevent concurrent runs
  const lockHolder = await acquireLock();
  if (!lockHolder) {
    logger.warn("Cron skipped — another execution is in progress");
    return NextResponse.json(
      { error: "Another cron execution is in progress. Try again later." },
      { status: 409 },
    );
  }

  const runStart = Date.now();

  try {
    // 4. Check maintenance mode (global kill switch)
    const settings = (await getSiteSettings()) as Record<string, unknown>;
    if (settings.maintenanceMode) {
      return NextResponse.json(
        {
          message: "Maintenance mode active — all cron tasks skipped",
          results: [],
        },
        { status: 200 },
      );
    }

    // 5. Run all cleanup tasks — each gated by its kill switch
    const results: TaskResult[] = [];

    // 5a. Publish scheduled posts
    results.push(
      await runTask("publish-scheduled-posts", true, async () => {
        await blogService.processScheduledPosts();
      }),
    );

    // 5b. Publish scheduled pages
    results.push(
      await runTask("publish-scheduled-pages", true, async () => {
        await pageService.processScheduledPages();
      }),
    );

    // 5c. Release stale post locks
    results.push(
      await runTask("release-stale-post-locks", true, async () => {
        await blogService.releaseStaleLocksAll();
      }),
    );

    // 5d. Release stale page locks
    results.push(
      await runTask("release-stale-page-locks", true, async () => {
        await pageService.releaseAllStaleLocks();
      }),
    );

    // 5e. Cleanup orphaned tags
    results.push(
      await runTask("cleanup-orphaned-tags", true, async () => {
        await tagService.cleanupOrphanedTags();
      }),
    );

    // 5f. SEO keyword volume history cleanup
    results.push(
      await runTask("cleanup-seo-volume-history", true, async () => {
        await seoService.cleanupVolumeHistory(90);
      }),
    );

    // 5g. Media: cleanup orphaned optimized files
    results.push(
      await runTask("cleanup-orphaned-media", true, async () => {
        await mediaService.cleanupOrphaned();
      }),
    );

    // 5h. Media: purge soft-deleted items
    results.push(
      await runTask("purge-deleted-media", true, async () => {
        await mediaService.purgeDeleted();
      }),
    );

    // 5i. Comment spam purge
    const commentsEnabled = (settings.enableComments as boolean) ?? true;
    results.push(
      await runTask("purge-spam-comments", commentsEnabled, async () => {
        await moderationService.purgeOldSpam();
      }),
    );

    // 5j. Comment deleted purge
    results.push(
      await runTask("purge-deleted-comments", commentsEnabled, async () => {
        await moderationService.purgeDeleted();
      }),
    );

    // 5k. CAPTCHA attempt cleanup
    const captchaEnabled = (settings.captchaEnabled as boolean) ?? true;
    results.push(
      await runTask("purge-captcha-attempts", captchaEnabled, async () => {
        await captchaAdminSettings.purgeOldAttempts(30);
      }),
    );

    // 5l. Ads: purge old ad logs
    const adsEnabled = (settings.adsEnabled as boolean) ?? false;
    results.push(
      await runTask("purge-old-ad-logs", adsEnabled, async () => {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        await prisma.adLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      }),
    );

    // 5m. Ads: deactivate expired placements
    results.push(
      await runTask(
        "deactivate-expired-ad-placements",
        adsEnabled,
        async () => {
          const now = new Date();
          await prisma.adPlacement.updateMany({
            where: { endDate: { lt: now }, isActive: true },
            data: { isActive: false },
          });
        },
      ),
    );

    // 5n. Distribution: process scheduled distributions
    const distributionEnabled =
      (settings.distributionEnabled as boolean) ?? false;
    results.push(
      await runTask(
        "process-scheduled-distributions",
        distributionEnabled,
        async () => {
          await distributionService.processScheduledDistributions();
        },
      ),
    );

    // 5o. Distribution: cleanup old records
    results.push(
      await runTask(
        "cleanup-old-distribution-records",
        distributionEnabled,
        async () => {
          await distributionService.cleanupOldRecords();
        },
      ),
    );

    // 5p. Ads: sync ad slot page types
    results.push(
      await runTask("sync-ad-slot-page-types", adsEnabled, async () => {
        await syncAdSlotPageTypes(scanPrisma);
      }),
    );

    // ── SEO Auto-Enhancement Tasks ──────────────────────────────────────

    // 5q-seo. Bulk SEO enhancement (fill missing + improve weak fields)
    results.push(
      await runTask("seo-bulk-enhance", true, async () => {
        await seoService.bulkEnhanceContent(30, false);
      }),
    );

    // 5r-seo. Auto-interlink content (scan & inject internal links)
    results.push(
      await runTask("seo-auto-interlink", true, async () => {
        const interlinkSvc = new InterlinkService(interlinkPrisma);
        await interlinkSvc.autoLinkAll(50);
      }),
    );

    // 5s-seo. Generate SEO suggestions from audit
    results.push(
      await runTask("seo-generate-suggestions", true, async () => {
        await seoService.generateSuggestions("site");
      }),
    );

    // ── NEW: Housekeeping tasks ─────────────────────────────────────────

    // 5q. Cleanup expired sessions
    results.push(
      await runTask("cleanup-expired-sessions", true, async () => {
        const now = new Date();
        await prisma.userSession.deleteMany({
          where: { expiresAt: { lt: now } },
        });
      }),
    );

    // 5r. Cleanup expired email verification / change tokens
    results.push(
      await runTask("cleanup-expired-tokens", true, async () => {
        const now = new Date();
        await prisma.emailVerificationToken.deleteMany({
          where: { expiresAt: { lt: now } },
        });
        await prisma.emailChangeRequest.deleteMany({
          where: { expiresAt: { lt: now } },
        });
      }),
    );

    // 5s. Cleanup old cron logs (keep last 90 days)
    results.push(
      await runTask("cleanup-old-cron-logs", true, async () => {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        await prisma.cronLog.deleteMany({
          where: { createdAt: { lt: cutoff } },
        });
      }),
    );

    // ── 5t. Newsletter digest ─────────────────────────────────────────────
    const digestConfig = await siteSettingsService.getDigestConfig();
    const digestEnabled = digestConfig.emailDigestEnabled;
    results.push(
      await runTask("send-newsletter-digest", digestEnabled, async () => {
        // Determine the lookback window based on frequency
        const freq = digestConfig.emailDigestFrequency || "weekly";
        const lookbackMs =
          freq === "daily"
            ? 24 * 60 * 60 * 1000
            : freq === "monthly"
              ? 30 * 24 * 60 * 60 * 1000
              : /* weekly */ 7 * 24 * 60 * 60 * 1000;

        const since = new Date(Date.now() - lookbackMs);

        // Fetch recently published posts
        const recentPosts = await prisma.post.findMany({
          where: { status: "PUBLISHED", publishedAt: { gte: since } },
          select: { title: true, slug: true, excerpt: true, publishedAt: true },
          orderBy: { publishedAt: "desc" },
          take: 20,
        });

        if (recentPosts.length === 0) {
          logger.info("Newsletter digest: no new posts to send");
          return;
        }

        // Fetch confirmed subscribers
        const subscribers = await prisma.newsletterSubscriber.findMany({
          where: { confirmed: true, unsubscribedAt: null },
          select: { email: true, name: true, unsubscribeToken: true },
        });

        if (subscribers.length === 0) {
          logger.info("Newsletter digest: no confirmed subscribers");
          return;
        }

        // Build digest HTML
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXTAUTH_URL ||
          "https://example.com";
        const siteName = (settings.siteName as string) || "MyBlog";
        const postsHtml = recentPosts
          .map(
            (p) =>
              `<li style="margin-bottom:12px">
            <a href="${siteUrl}/blog/${p.slug}" style="color:#3b82f6;text-decoration:none;font-weight:600">${escapeHtmlForDigest(p.title)}</a>
            ${p.excerpt ? `<br/><span style="color:#6b7280;font-size:14px">${escapeHtmlForDigest(p.excerpt)}</span>` : ""}
          </li>`,
          )
          .join("\n");

        const getSmtpConfig = () => siteSettingsService.getSmtpConfig();

        let sent = 0;
        for (const sub of subscribers) {
          const unsubLink = `${siteUrl}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;
          const html = `
            <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif">
              <h2 style="color:#1f2937">${escapeHtmlForDigest(siteName)} — ${freq.charAt(0).toUpperCase() + freq.slice(1)} Digest</h2>
              ${sub.name ? `<p>Hi ${escapeHtmlForDigest(sub.name)},</p>` : "<p>Hi there,</p>"}
              <p>Here are the latest posts from the past ${freq === "daily" ? "day" : freq === "monthly" ? "month" : "week"}:</p>
              <ul style="padding-left:20px">${postsHtml}</ul>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
              <p style="font-size:12px;color:#9ca3af">
                <a href="${unsubLink}" style="color:#9ca3af">Unsubscribe</a>
              </p>
            </div>
          `;
          try {
            await sendTransactionalEmail(
              getSmtpConfig,
              sub.email,
              `${siteName} — ${freq} digest`,
              html,
            );
            sent++;
          } catch (err) {
            logger.warn(
              `Failed to send digest to ${sub.email}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
        logger.info(
          `Newsletter digest sent to ${sent}/${subscribers.length} subscribers`,
        );
      }),
    );

    // ── 5u. Process pending background jobs ────────────────────────────────
    results.push(
      await runTask("process-job-queue", true, async () => {
        const batch = await processJobBatch(5);
        logger.info("Job queue batch processed", {
          processed: batch.processed,
          succeeded: batch.succeeded,
          failed: batch.failed,
        });
      }),
    );

    // ── 5v. Update trending tags ───────────────────────────────────────────
    results.push(
      await runTask("update-trending-tags", true, async () => {
        const count = await tagService.updateTrendingTags();
        logger.info("Trending tags updated", { count });
      }),
    );

    // 6. Summary
    const summary = {
      ok: results.filter((r) => r.status === "ok").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    const durationMs = Date.now() - runStart;

    logger.info("Cron run completed", { ...summary, durationMs, triggeredBy });

    // 7. Persist to CronLog for admin history
    await persistLog(
      results,
      summary,
      durationMs,
      triggeredBy as "scheduler" | "manual",
    );

    return NextResponse.json({ summary, results }, { status: 200 });
  } finally {
    // Always release lock
    await releaseLock(lockHolder);
  }
}
