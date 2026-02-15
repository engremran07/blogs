import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { CreateFolderSchema } from "@/features/media/server/schemas";

const logger = createLogger("api/media/folders");

/**
 * GET /api/media/folders — List all media folders.
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string })?.role;
    if (
      !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR", "AUTHOR"].includes(
        role || ""
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

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
      (session.user as { id?: string })?.id
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
