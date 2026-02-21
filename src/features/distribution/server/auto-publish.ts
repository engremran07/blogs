/**
 * Auto-publish helper — distributes a post to all channels with autoPublish=true.
 * Called from Posts API when a post status transitions to PUBLISHED.
 */
import { prisma } from "@/server/db/prisma";
import { distributionService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { SocialPlatform } from "@/features/distribution/types";

const logger = createLogger("distribution/auto-publish");

const SOCIAL_PLATFORM_SET = new Set<string>(Object.values(SocialPlatform));

function isSocialPlatform(value: string): value is SocialPlatform {
  return SOCIAL_PLATFORM_SET.has(value);
}

export async function autoDistributePost(postId: string): Promise<void> {
  try {
    // Check if distribution is enabled globally
    const settings = await prisma.siteSettings.findFirst();
    if (!(settings as Record<string, unknown>)?.distributionEnabled) return;

    // Find channels with autoPublish enabled
    const channels = await prisma.distributionChannel.findMany({
      where: { enabled: true, autoPublish: true },
    });

    if (channels.length === 0) return;

    // Check if this post was already distributed (avoid duplicates on re-publish)
    const existing = await prisma.distributionRecord.findFirst({
      where: { postId, status: "PUBLISHED" },
    });
    if (existing) {
      logger.info("Post already distributed, skipping auto-publish", {
        postId,
      });
      return;
    }

    const platforms = channels
      .map((ch: { platform: string }) => ch.platform)
      .filter(isSocialPlatform);
    const uniquePlatforms = [...new Set(platforms)] as SocialPlatform[];

    logger.info("Auto-distributing post", {
      postId,
      platforms: uniquePlatforms,
    });

    await distributionService.distributePost({
      postId,
      platforms: uniquePlatforms,
    });
  } catch (error) {
    logger.error("Auto-distribute failed", { postId, error });
  }
}
