import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/media/stats");

/**
 * GET /api/media/stats — Get media library statistics.
 */
export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const result = await mediaService.getStats();
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/stats] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
