import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { CreateFolderSchema } from "@/features/media/server/schemas";

const logger = createLogger("api/media/folders");

/**
 * GET /api/media/folders — List all media folders.
 */
export async function GET() {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const result = await mediaService.listFolders();
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/folders] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to list folders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media/folders — Create a new folder.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: 'author' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const validation = CreateFolderSchema.safeParse(body);

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

    const result = await mediaService.createFolder(
      validation.data.name,
      validation.data.parentId,
      userId
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("[api/media/folders] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
