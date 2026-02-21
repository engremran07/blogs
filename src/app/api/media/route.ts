import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UploadMediaSchema } from "@/features/media/server/schemas";
import { MEDIA_LIMITS } from "@/features/media/server/constants";
import { parseJsonUnknown } from "@/shared/safe-json.util";
import { z } from "zod";

const logger = createLogger("api/media");

/** Valid sort fields for media listing. */
const VALID_SORT_FIELDS = ["name", "size", "date", "type"] as const;
const VALID_SORT_DIRS = ["asc", "desc"] as const;
const VALID_MEDIA_TYPES = [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "OTHER",
] as const;

/** Zod schema for GET /api/media query parameters. */
const mediaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MEDIA_LIMITS.MAX_PAGE_SIZE)
    .default(MEDIA_LIMITS.DEFAULT_PAGE_SIZE),
  search: z
    .string()
    .max(200, "Search query too long")
    .transform((s) => s.trim())
    .optional(),
  folder: z
    .string()
    .max(500, "Folder path too long")
    .refine((f) => !/\.\.|[<>"'`;]/.test(f), "Invalid folder path")
    .optional(),
  mediaType: z.enum(VALID_MEDIA_TYPES).optional(),
  sortField: z.enum(VALID_SORT_FIELDS).default("date"),
  sortDir: z.enum(VALID_SORT_DIRS).default("desc"),
});

/**
 * GET /api/media — List media items with filtering, sorting, pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);

    // Validate all query params through Zod
    const parsed = mediaListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") || undefined,
      folder: searchParams.get("folder") || undefined,
      mediaType: searchParams.get("mediaType") || undefined,
      sortField: searchParams.get("sortField") || undefined,
      sortDir: searchParams.get("sortDir") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { page, pageSize, search, folder, mediaType, sortField, sortDir } =
      parsed.data;

    const filter = {
      ...(search && { search }),
      ...(folder && { folder }),
      ...(mediaType && { mediaType }),
    };

    const sort = { field: sortField, direction: sortDir };

    const result = await mediaService.list(
      filter,
      sort,
      page,
      pageSize as number,
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/media] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch media" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/media — Upload a new media file.
 * Accepts multipart/form-data with a `file` field and optional metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: "author" });
    if (errorResponse) return errorResponse;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawTags = formData.get("tags");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    let tags: unknown = undefined;
    if (typeof rawTags === "string" && rawTags.length > 0) {
      const parsedTags = parseJsonUnknown(rawTags);
      if (!parsedTags.success) {
        return NextResponse.json(
          { success: false, error: "Invalid tags JSON" },
          { status: 400 },
        );
      }
      tags = parsedTags.data;
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
      tags,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 },
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
      userId,
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("[api/media] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
