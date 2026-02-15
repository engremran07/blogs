import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UploadFromUrlSchema } from "@/features/media/server/schemas";

const logger = createLogger("api/media/upload-url");

/**
 * POST /api/media/upload-url — Upload a file from a remote URL.
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
    const validation = UploadFromUrlSchema.safeParse(body);

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

    const result = await mediaService.uploadFromUrl(
      validation.data,
      (session.user as { id?: string })?.id
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("[api/media/upload-url] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to upload from URL" },
      { status: 500 }
    );
  }
}
