import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { pageService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/pages/bootstrap-system");

export async function POST() {
  try {
    const { userId, errorResponse } = await requireAuth({ level: "admin" });
    if (errorResponse) return errorResponse;

    const authorId = userId || "system";
    const results = await pageService.bootstrapSystemPages(authorId);

    return NextResponse.json({
      success: true,
      data: results,
      created: results.filter((r) => !r.isRegistered).length,
    });
  } catch (error) {
    logger.error("[api/pages/bootstrap-system] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to bootstrap system pages" },
      { status: 500 },
    );
  }
}
