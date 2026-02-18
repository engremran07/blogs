import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { RenameFolderSchema } from "@/features/media/server/schemas";

const logger = createLogger("api/media/folders/[id]");

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/media/folders/[id] — Rename a folder.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    // SEC-006: Require content-management role for folder operations
    const role = (session.user as { role?: string })?.role;
    if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    const validation = RenameFolderSchema.safeParse(body);
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

    const result = await mediaService.renameFolder(id, validation.data.name);

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/folders/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to rename folder" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/folders/[id] — Delete a folder.
 * Query param `mode=delete-contents` hard-deletes items, default moves to root.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string })?.role;
    if (!["ADMINISTRATOR", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const mode =
      searchParams.get("mode") === "delete-contents"
        ? "delete-contents"
        : "move-to-root";

    const result = await mediaService.deleteFolder(
      id,
      mode as "move-to-root" | "delete-contents"
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media/folders/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}
