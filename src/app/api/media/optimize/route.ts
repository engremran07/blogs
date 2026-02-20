import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const optimizeMediaSchema = z.object({
  id: z.string().min(1).optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
});

const logger = createLogger("api/media/optimize");

/**
 * POST /api/media/optimize — Trigger image optimization.
 * Body shape: { id?: string } — if `id` is provided, optimize a single item;
 * otherwise, bulk-optimize all un-optimized images.
 * Requires EDITOR+ role.
 */
export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const parsed = optimizeMediaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    if (parsed.data.id) {
      // Single item optimization
      const result = await mediaService.optimizeMedia(parsed.data.id);
      if (!result.success) {
        const status = result.error?.code === "NOT_FOUND" ? 404 : 400;
        return NextResponse.json(result, { status });
      }
      return NextResponse.json(result);
    }

    // Bulk optimization
    const result = await mediaService.bulkOptimize(parsed.data.filter);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/optimize] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Optimization failed" },
      { status: 500 },
    );
  }
}
