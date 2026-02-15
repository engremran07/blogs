import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/media/optimize");

/**
 * POST /api/media/optimize — Trigger image optimization.
 * Body shape: { id?: string } — if `id` is provided, optimize a single item;
 * otherwise, bulk-optimize all un-optimized images.
 * Requires EDITOR+ role.
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();

    if (body.id) {
      // Single item optimization
      const result = await mediaService.optimizeMedia(body.id);
      if (!result.success) {
        const status = result.error?.code === "NOT_FOUND" ? 404 : 400;
        return NextResponse.json(result, { status });
      }
      return NextResponse.json(result);
    }

    // Bulk optimization
    const result = await mediaService.bulkOptimize(body.filter);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/optimize] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Optimization failed" },
      { status: 500 }
    );
  }
}
