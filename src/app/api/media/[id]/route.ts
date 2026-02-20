import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UpdateMediaSchema } from "@/features/media/server/schemas";

const logger = createLogger("api/media/[id]");

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/media/[id] — Get a single media item by ID.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { errorResponse } = await requireAuth({ level: 'author' });
    if (errorResponse) return errorResponse;

    const { id } = await context.params;
    const result = await mediaService.getById(id);

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch media item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/media/[id] — Update media metadata (alt text, title, tags, etc.).
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: 'author' });
    if (errorResponse) return errorResponse;

    const { id } = await context.params;
    const body = await req.json();

    const validation = UpdateMediaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await mediaService.update(
      id,
      validation.data,
      userId
    );

    if (!result.success) {
      const statusCode =
        result.error?.code === "NOT_FOUND"
          ? 404
          : result.error?.code === "FORBIDDEN"
          ? 403
          : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update media item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/[id] — Delete a media item (soft or hard based on config).
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: 'author' });
    if (errorResponse) return errorResponse;

    const { id } = await context.params;

    const result = await mediaService.delete(
      id,
      userId
    );

    if (!result.success) {
      const statusCode = result.error?.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete media item" },
      { status: 500 }
    );
  }
}
