import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { prisma, tagService } from "@/server/wiring";
import { updateTagSchema } from "@/features/tags/server/schemas";
import { createLogger } from "@/server/observability/logger";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tag = await tagService.findById(id);
    if (!tag) {
      return NextResponse.json(
        { success: false, error: "Tag not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    logger.error("[api/tags/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch tag" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
      const existing = await tagService.findBySlug(body.slug);
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { success: false, error: "Slug already in use" },
          { status: 409 },
        );
      }
    }

    const parsed = updateTagSchema.safeParse(body);
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

    const tag = await tagService.update(id, parsed.data);

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    const message = "Failed to update tag";
    logger.error("[api/tags/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes("not found") ? 404 : 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { errorResponse } = await requireAuth({ level: "moderator" });
    if (errorResponse) return errorResponse;

    // Fetch the tag slug before deleting so we can auto-exclude
    const tag = await prisma.tag.findUnique({
      where: { id },
      select: { slug: true },
    });

    await tagService.delete(id);

    // Auto-exclude this tag from ad slot pageTypes
    if (tag?.slug) {
      void removePageTypesFromSlots(scanPrisma, [`tag:${tag.slug}`]).catch(
        () => {},
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = "Failed to delete tag";
    logger.error("[api/tags/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes("not found") ? 404 : 400 },
    );
  }
}
