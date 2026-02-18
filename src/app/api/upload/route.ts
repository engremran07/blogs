import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UploadMediaSchema } from "@/features/media/server/schemas";

const logger = createLogger("api/upload");

/**
 * POST /api/upload — Legacy upload endpoint.
 * Now delegates to the Media Manager service for unified storage,
 * deduplication, variant generation, and metadata tracking.
 *
 * Maintains the original response shape for backwards compatibility.
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
    // SEC-004: Require content role for uploads
    const role = (session.user as { role?: string })?.role;
    if (!["AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const purpose = (formData.get("purpose") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate MIME type and size via schema before reading body
    const validation = UploadMediaSchema.safeParse({
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      folder: purpose,
    });

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await mediaService.uploadFile(
      {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        folder: validation.data.folder,
      },
      (session.user as { id?: string })?.id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || "Upload failed" },
        { status: 400 }
      );
    }

    // Return legacy response shape for backwards compatibility
    const item = result.data!;
    return NextResponse.json({
      success: true,
      data: {
        url: item.url,
        fileName: item.filename,
        size: item.size,
        type: item.mimeType,
        mediaId: item.id,
      },
    });
  } catch (error) {
    logger.error("[api/upload] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
