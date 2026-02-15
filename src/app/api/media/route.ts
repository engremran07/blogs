import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UploadMediaSchema } from "@/features/media/server/schemas";
import { MEDIA_LIMITS } from "@/features/media/server/constants";

const logger = createLogger("api/media");

/** Valid sort fields for media listing. */
const VALID_SORT_FIELDS = ["name", "size", "date", "type"] as const;
const VALID_SORT_DIRS = ["asc", "desc"] as const;
const VALID_MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "OTHER"] as const;

/**
 * GET /api/media — List media items with filtering, sorting, pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Validate and clamp pagination params
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawPageSize = parseInt(searchParams.get("pageSize") || "30", 10);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(Math.max(rawPageSize, 1), MEDIA_LIMITS.MAX_PAGE_SIZE)
      : MEDIA_LIMITS.DEFAULT_PAGE_SIZE;

    const search = searchParams.get("search") || undefined;
    const folder = searchParams.get("folder") || undefined;

    // Validate mediaType
    const rawMediaType = searchParams.get("mediaType");
    const mediaType = rawMediaType && (VALID_MEDIA_TYPES as readonly string[]).includes(rawMediaType)
      ? (rawMediaType as "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" | "OTHER")
      : undefined;

    // Validate sort params
    const rawSortField = searchParams.get("sortField") || "date";
    const rawSortDir = searchParams.get("sortDir") || "desc";
    const sortField = (VALID_SORT_FIELDS as readonly string[]).includes(rawSortField)
      ? (rawSortField as "name" | "size" | "date" | "type")
      : "date";
    const sortDir = (VALID_SORT_DIRS as readonly string[]).includes(rawSortDir)
      ? (rawSortDir as "asc" | "desc")
      : "desc";

    const filter = {
      ...(search && { search }),
      ...(folder && { folder }),
      ...(mediaType && { mediaType }),
    };

    const sort = { field: sortField, direction: sortDir };

    const result = await mediaService.list(filter, sort, page, pageSize as number);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media — Upload a new media file.
 * Accepts multipart/form-data with a `file` field and optional metadata.
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate with Zod schema
    const validation = UploadMediaSchema.safeParse({
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      folder: formData.get("folder") || undefined,
      altText: formData.get("altText") || undefined,
      title: formData.get("title") || undefined,
      description: formData.get("description") || undefined,
      tags: formData.get("tags")
        ? JSON.parse(formData.get("tags") as string)
        : undefined,
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
        altText: validation.data.altText,
        title: validation.data.title,
        description: validation.data.description,
        tags: validation.data.tags,
      },
      (session.user as { id?: string })?.id
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("[api/media] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
