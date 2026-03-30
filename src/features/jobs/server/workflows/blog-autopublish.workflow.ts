/**
 * ============================================================================
 * WORKFLOW:  Blog Auto-Publish
 * STEPS:     select → validate → publish → notify
 * PURPOSE:   Select scheduled/draft posts matching criteria, validate readiness,
 *            publish them, and send notifications.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";
import { prisma } from "@/server/db/prisma";

export const steps: WorkflowStepMap = {
  /**
   * Step 1: Select posts that are scheduled for publication (scheduledFor <= now).
   */
  select: async (_job, payload) => {
    const { criteria, dryRun } = payload as {
      criteria?: {
        status?: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";
        tag?: string;
      };
      dryRun?: boolean;
    };

    const now = new Date();

    // Find posts that are scheduled and due for publication
    const posts = await prisma.post.findMany({
      where: {
        status: criteria?.status ?? "SCHEDULED",
        deletedAt: null,
        scheduledFor: { lte: now },
        ...(criteria?.tag && { tags: { some: { slug: criteria.tag } } }),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        wordCount: true,
        featuredImage: true,
        scheduledFor: true,
        tags: { select: { name: true, slug: true } },
      },
      orderBy: { scheduledFor: "asc" },
      take: 20,
    });

    return {
      success: true,
      data: {
        step: "select",
        candidateCount: posts.length,
        dryRun: dryRun || false,
        candidates: posts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          wordCount: p.wordCount,
          hasExcerpt: !!p.excerpt,
          hasFeaturedImage: !!p.featuredImage,
          scheduledFor: p.scheduledFor?.toISOString() || null,
          tagCount: p.tags.length,
        })),
      },
      nextStep: "validate",
    };
  },

  /**
   * Step 2: Validate readiness — check word count, excerpt, featured image.
   */
  validate: async (job, _payload) => {
    const result = (job.result ?? {}) as Record<string, unknown>;
    const selectData = result.select as Record<string, unknown> | undefined;
    const candidates =
      (selectData?.candidates as Array<{
        id: string;
        title: string;
        slug: string;
        wordCount: number;
        hasExcerpt: boolean;
        hasFeaturedImage: boolean;
      }>) || [];

    const MIN_WORD_COUNT = 100;

    const validated = candidates.map((post) => {
      const issues: string[] = [];

      if (post.wordCount < MIN_WORD_COUNT) {
        issues.push(
          `Word count (${post.wordCount}) below minimum (${MIN_WORD_COUNT})`,
        );
      }
      if (!post.hasExcerpt) {
        issues.push("Missing excerpt");
      }
      if (!post.hasFeaturedImage) {
        issues.push("Missing featured image");
      }

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        ready: issues.length === 0,
        issues,
      };
    });

    return {
      success: true,
      data: {
        step: "validate",
        total: validated.length,
        ready: validated.filter((v) => v.ready).length,
        notReady: validated.filter((v) => !v.ready).length,
        posts: validated,
      },
      nextStep: "publish",
    };
  },

  /**
   * Step 3: Publish validated posts — update status and set publishedAt.
   */
  publish: async (job, payload) => {
    const { dryRun } = payload as { dryRun?: boolean };
    const result = (job.result ?? {}) as Record<string, unknown>;
    const validateData = result.validate as Record<string, unknown> | undefined;
    const posts =
      (validateData?.posts as Array<{
        id: string;
        title: string;
        slug: string;
        ready: boolean;
        issues: string[];
      }>) || [];

    const readyPosts = posts.filter((p) => p.ready);

    if (dryRun) {
      return {
        success: true,
        data: {
          step: "publish",
          dryRun: true,
          wouldPublish: readyPosts.length,
          posts: readyPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
          })),
        },
        nextStep: "notify",
      };
    }

    const now = new Date();
    const published: Array<{ id: string; title: string; slug: string }> = [];
    const errors: Array<{ id: string; title: string; error: string }> = [];

    for (const post of readyPosts) {
      try {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            scheduledFor: null,
          },
        });
        published.push({ id: post.id, title: post.title, slug: post.slug });
      } catch (err) {
        errors.push({
          id: post.id,
          title: post.title,
          error: err instanceof Error ? err.message : "unknown error",
        });
      }
    }

    return {
      success: true,
      data: {
        step: "publish",
        dryRun: false,
        published: published.length,
        errors: errors.length,
        publishedPosts: published,
        errorDetails: errors,
      },
      nextStep: "notify",
    };
  },

  /**
   * Step 4: Create distribution records for auto-published posts.
   */
  notify: async (job, _payload) => {
    const result = (job.result ?? {}) as Record<string, unknown>;
    const publishData = result.publish as Record<string, unknown> | undefined;
    const publishedPosts =
      (publishData?.publishedPosts as Array<{
        id: string;
        title: string;
        slug: string;
      }>) || [];
    const dryRun = publishData?.dryRun as boolean;

    if (dryRun || publishedPosts.length === 0) {
      return {
        success: true,
        data: {
          step: "notify",
          notified: 0,
          reason: dryRun
            ? "Dry run — no notifications sent"
            : "No posts were published",
        },
      };
    }

    // Find auto-publish channels
    const autoChannels = await prisma.distributionChannel.findMany({
      where: { enabled: true, autoPublish: true },
      select: { id: true, platform: true, name: true },
    });

    if (autoChannels.length === 0) {
      return {
        success: true,
        data: {
          step: "notify",
          notified: 0,
          reason: "No auto-publish channels configured",
          publishedPostIds: publishedPosts.map((p) => p.id),
        },
      };
    }

    let recordsCreated = 0;
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
    ).replace(/\/$/, "");

    for (const post of publishedPosts) {
      const postUrl = `${siteUrl}/blog/${post.slug}`;
      for (const channel of autoChannels) {
        try {
          await prisma.distributionRecord.create({
            data: {
              postId: post.id,
              channelId: channel.id,
              platform: channel.platform,
              content: `📢 New post: ${post.title}\n\n${postUrl}`,
              status: "PENDING",
              retryCount: 0,
              maxRetries: 3,
            },
          });
          recordsCreated++;
        } catch {
          // Non-blocking — log but continue
        }
      }
    }

    return {
      success: true,
      data: {
        step: "notify",
        notified: recordsCreated,
        postsNotified: publishedPosts.length,
        channelsUsed: autoChannels.length,
        publishedPosts: publishedPosts.map((p) => ({
          id: p.id,
          title: p.title,
        })),
      },
    };
  },
};
