/**
 * ============================================================================
 * API ROUTE:  POST /api/jobs/run
 * PURPOSE:    Trigger a batch of job processing. Protected by CRON_SECRET
 *             so it can be called by Vercel Cron or the /api/cron handler.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";
import { processJobBatch } from "@/features/jobs/server/runner";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api:jobs:run");

export async function POST(request: NextRequest) {
  // 1. Verify CRON_SECRET
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== env.CRON_SECRET) {
    logger.warn("Unauthorized job run attempt", {
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    });
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // 2. Process a batch
  try {
    const result = await processJobBatch(5);

    logger.info("Job batch completed", {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    });

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Job batch failed", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
