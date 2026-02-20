import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import {
  BulkDeleteSchema,
  BulkMoveSchema,
  BulkTagSchema,
} from "@/features/media/server/schemas";

const logger = createLogger("api/media/bulk");

/**
 * POST /api/media/bulk — Handle bulk operations (delete, move, tag).
 * Body shape: { action: "delete" | "move" | "tag", ...payload }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { action, ...payload } = body;

    switch (action) {
      case "delete": {
        const validation = BulkDeleteSchema.safeParse(payload);
        if (!validation.success) {
          return NextResponse.json(
            { success: false, error: "Validation failed", details: validation.error.flatten() },
            { status: 400 }
          );
        }
        const result = await mediaService.bulkDelete(validation.data, userId);
        return NextResponse.json(result);
      }

      case "move": {
        const validation = BulkMoveSchema.safeParse(payload);
        if (!validation.success) {
          return NextResponse.json(
            { success: false, error: "Validation failed", details: validation.error.flatten() },
            { status: 400 }
          );
        }
        const result = await mediaService.bulkMove(validation.data, userId);
        return NextResponse.json(result);
      }

      case "tag": {
        const validation = BulkTagSchema.safeParse(payload);
        if (!validation.success) {
          return NextResponse.json(
            { success: false, error: "Validation failed", details: validation.error.flatten() },
            { status: 400 }
          );
        }
        const result = await mediaService.bulkUpdateTags(validation.data, userId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("[api/media/bulk] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Bulk operation failed" },
      { status: 500 }
    );
  }
}
