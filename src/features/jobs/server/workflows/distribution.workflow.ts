/**
 * ============================================================================
 * WORKFLOW:  Distribution
 * STEPS:     select-targets → format → distribute → verify
 * PURPOSE:   Select distribution channels, format content for each,
 *            distribute, and verify delivery.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";
import { prisma } from "@/server/db/prisma";
import { distributionService } from "@/server/wiring";
import { stripHtml } from "@/shared/text.util";

export const steps: WorkflowStepMap = {
  /**
   * Step 1: Select enabled distribution channels for the post.
   */
  "select-targets": async (_job, payload) => {
    const { postId, channels: channelFilter } = payload as {
      postId: string;
      channels?: string[];
    };

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, status: true, deletedAt: true },
    });

    if (!post) {
      return { success: false, error: `Post ${postId} not found` };
    }
    if (post.status !== "PUBLISHED") {
      return {
        success: false,
        error: `Post ${postId} is not published (status: ${post.status})`,
      };
    }

    // Get enabled channels
    const allChannels = await distributionService.getChannels(true);

    // Filter by requested channels if specified
    const selectedChannels = channelFilter?.length
      ? allChannels.filter(
          (ch) =>
            channelFilter.includes(ch.id) ||
            channelFilter.includes(ch.platform),
        )
      : allChannels;

    if (selectedChannels.length === 0) {
      return {
        success: true,
        data: {
          step: "select-targets",
          postId,
          channelsFound: 0,
          reason: "No enabled distribution channels found",
        },
      };
    }

    return {
      success: true,
      data: {
        step: "select-targets",
        postId,
        postTitle: post.title,
        channelsFound: selectedChannels.length,
        channels: selectedChannels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          platform: ch.platform,
          autoPublish: ch.autoPublish,
        })),
      },
      nextStep: "format",
    };
  },

  /**
   * Step 2: Format content for each target platform.
   */
  format: async (job, payload) => {
    const { postId } = payload as { postId: string };
    const result = (job.result ?? {}) as Record<string, unknown>;
    const selectData = result["select-targets"] as
      | Record<string, unknown>
      | undefined;
    const channels =
      (selectData?.channels as Array<{
        id: string;
        name: string;
        platform: string;
      }>) || [];

    if (channels.length === 0) {
      return {
        success: true,
        data: {
          step: "format",
          formatted: 0,
          reason: "No channels to format for",
        },
      };
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        title: true,
        excerpt: true,
        content: true,
        slug: true,
        tags: { select: { name: true } },
        featuredImage: true,
      },
    });

    if (!post) {
      return { success: false, error: `Post ${postId} not found` };
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
    ).replace(/\/$/, "");
    const postUrl = `${siteUrl}/blog/${post.slug}`;
    const plainExcerpt = post.excerpt || stripHtml(post.content).slice(0, 200);
    const hashtags = post.tags
      .map((t) => `#${t.name.replace(/\s+/g, "")}`)
      .join(" ");

    // Platform-specific formatting
    const formatted = channels.map((ch) => {
      let message: string;
      switch (ch.platform.toUpperCase()) {
        case "TWITTER":
        case "X":
          message =
            `${post.title}\n\n${plainExcerpt.slice(0, 200)}\n\n${postUrl}\n\n${hashtags}`.slice(
              0,
              280,
            );
          break;
        case "LINKEDIN":
          message = `📝 ${post.title}\n\n${plainExcerpt}\n\nRead more: ${postUrl}\n\n${hashtags}`;
          break;
        case "FACEBOOK":
          message = `${post.title}\n\n${plainExcerpt}\n\n🔗 ${postUrl}`;
          break;
        default:
          message = `${post.title}\n\n${plainExcerpt}\n\n${postUrl}`;
      }
      return { channelId: ch.id, platform: ch.platform, message, postUrl };
    });

    return {
      success: true,
      data: {
        step: "format",
        postId,
        formatted: formatted.length,
        messages: formatted,
        postUrl,
        featuredImage: post.featuredImage,
      },
      nextStep: "distribute",
    };
  },

  /**
   * Step 3: Create DistributionRecords and attempt publish.
   */
  distribute: async (job, payload) => {
    const { postId } = payload as { postId: string };
    const result = (job.result ?? {}) as Record<string, unknown>;
    const formatData = result.format as Record<string, unknown> | undefined;
    const messages =
      (formatData?.messages as Array<{
        channelId: string;
        platform: string;
        message: string;
      }>) || [];

    if (messages.length === 0) {
      return {
        success: true,
        data: {
          step: "distribute",
          distributed: 0,
          reason: "No formatted messages",
        },
        nextStep: "verify",
      };
    }

    const results: Array<{
      channelId: string;
      platform: string;
      recordId: string;
      status: string;
    }> = [];

    for (const msg of messages) {
      try {
        const record = await prisma.distributionRecord.create({
          data: {
            postId,
            channelId: msg.channelId,
            platform: msg.platform,
            content: msg.message,
            status: "PENDING",
            retryCount: 0,
            maxRetries: 3,
          },
        });
        results.push({
          channelId: msg.channelId,
          platform: msg.platform,
          recordId: record.id,
          status: "PENDING",
        });
      } catch (err) {
        results.push({
          channelId: msg.channelId,
          platform: msg.platform,
          recordId: "",
          status: `ERROR: ${err instanceof Error ? err.message : "unknown"}`,
        });
      }
    }

    return {
      success: true,
      data: {
        step: "distribute",
        postId,
        distributed: results.filter((r) => r.status === "PENDING").length,
        errors: results.filter((r) => r.status.startsWith("ERROR")).length,
        records: results,
      },
      nextStep: "verify",
    };
  },

  /**
   * Step 4: Verify delivery by checking record statuses.
   */
  verify: async (job, _payload) => {
    const result = (job.result ?? {}) as Record<string, unknown>;
    const distributeData = result.distribute as
      | Record<string, unknown>
      | undefined;
    const records =
      (distributeData?.records as Array<{
        recordId: string;
        platform: string;
        status: string;
      }>) || [];

    const recordIds = records.filter((r) => r.recordId).map((r) => r.recordId);

    if (recordIds.length === 0) {
      return {
        success: true,
        data: { step: "verify", verified: 0, reason: "No records to verify" },
      };
    }

    // Check current statuses
    const currentRecords = await prisma.distributionRecord.findMany({
      where: { id: { in: recordIds } },
      select: {
        id: true,
        platform: true,
        status: true,
        externalId: true,
        externalUrl: true,
        error: true,
      },
    });

    const summary = {
      total: currentRecords.length,
      published: currentRecords.filter((r) => r.status === "PUBLISHED").length,
      pending: currentRecords.filter((r) => r.status === "PENDING").length,
      failed: currentRecords.filter((r) => r.status === "FAILED").length,
    };

    return {
      success: true,
      data: {
        step: "verify",
        ...summary,
        records: currentRecords.map((r) => ({
          id: r.id,
          platform: r.platform,
          status: r.status,
          externalId: r.externalId,
          externalUrl: r.externalUrl,
          error: r.error,
        })),
      },
    };
  },
};
