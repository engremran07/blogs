import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { prisma, tagService } from "@/server/wiring";
import { createTagSchema } from "@/features/tags/server/schemas";
import { addPageTypesToSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import { createLogger } from "@/server/observability/logger";
import type { TagSortField } from "@/features/tags/types";

const logger = createLogger("api/tags");

const scanPrisma: ScanPrisma = {
  category: { findMany: (args) => prisma.category.findMany(args as never) },
  tag: { findMany: (args) => prisma.tag.findMany(args as never) },
  page: { findMany: (args) => prisma.page.findMany(args as never) },
  post: {
    count: (args) => prisma.post.count(args as never),
    findMany: (args) => prisma.post.findMany(args as never),
  },
  adSlot: {
    findMany: (args) => prisma.adSlot.findMany(args as never),
    update: (args) => prisma.adSlot.update(args as never),
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const search = searchParams.get("search") || undefined;
    const sortBy = searchParams.get("sortBy") || "usageCount";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    const result = await tagService.findAll({
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      search,
      sortBy: sortBy as TagSortField,
      sortOrder,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("[api/tags] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: "moderator" });
    if (errorResponse) return errorResponse;

    const body = await req.json();

    if (body.slug) {
      body.slug = body.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const tag = await tagService.create(parsed.data);

    // Auto-include this tag in ad slot page types
    void addPageTypesToSlots(scanPrisma, [`tag:${tag.slug}`]).catch(() => {});

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    const message = "Failed to create tag";
    logger.error("[api/tags] POST error:", { error });
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
