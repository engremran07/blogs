/**
 * ============================================================================
 * API ROUTE:  POST /api/publish-scheduled
 * PURPOSE:    On-demand scheduled post/page publisher.
 *             Replaces the Vercel Cron approach for free-tier deploys.
 *
 * Can be triggered by:
 *   • Admin panel "Publish Now" button
 *   • Free external scheduler (cron-job.org, UptimeRobot, GitHub Actions)
 *   • Next.js instrumentation on cold start (future option)
 *
 * Auth: Requires admin session (via requireAuth).
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import {
  blogService,
  pageService,
} from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api:publish-scheduled");

export async function POST() {
  const { errorResponse } = await requireAuth({ level: "admin" });
  if (errorResponse) return errorResponse;

  const results: { task: string; published: number; error?: string }[] = [];

  // 1. Publish scheduled posts
  try {
    const postResult = await blogService.processScheduledPosts();
    results.push({
      task: "scheduled-posts",
      published: postResult.processed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Failed to publish scheduled posts", { error: msg });
    results.push({ task: "scheduled-posts", published: 0, error: msg });
  }

  // 2. Publish scheduled pages
  try {
    const pageResult = await pageService.processScheduledPages();
    results.push({
      task: "scheduled-pages",
      published: pageResult.processed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Failed to publish scheduled pages", { error: msg });
    results.push({ task: "scheduled-pages", published: 0, error: msg });
  }

  const totalPublished = results.reduce((sum, r) => sum + r.published, 0);
  const hasErrors = results.some((r) => r.error);

  logger.info("Scheduled publish completed", { totalPublished, results });

  return NextResponse.json({
    success: !hasErrors,
    data: { totalPublished, results },
  });
}
