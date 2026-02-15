import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/media/stats");

/**
 * GET /api/media/stats — Get media library statistics.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string })?.role;
    if (
      !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(role || "")
    ) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

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
