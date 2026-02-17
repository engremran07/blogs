import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { TagService } from "@/features/tags/server/tag.service";
import { updateTagSchema } from "@/features/tags/server/schemas";
import { createLogger } from "@/server/observability/logger";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";

const logger = createLogger("api/tags");
const tagService = new TagService(prisma as any);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tag = await tagService.findById(id);
    if (!tag) {
      return NextResponse.json({ success: false, error: "Tag not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    logger.error("[api/tags/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch tag" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();

    if (body.slug) {
      body.slug = body.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const existing = await tagService.findBySlug(body.slug);
      if (existing && existing.id !== id) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 });
      }
    }

    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const tag = await tagService.update(id, parsed.data);

    return NextResponse.json({ success: true, data: tag });
  } catch (error) {
    const message = "Failed to update tag";
    logger.error("[api/tags/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes("not found") ? 404 : 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    // Fetch the tag slug before deleting so we can auto-exclude
    const tag = await prisma.tag.findUnique({ where: { id }, select: { slug: true } });

    await tagService.delete(id);

    // Auto-exclude this tag from ad slot pageTypes
    if (tag?.slug) {
      void removePageTypesFromSlots(prisma as any, [`tag:${tag.slug}`]).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = "Failed to delete tag";
    logger.error("[api/tags/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes("not found") ? 404 : 400 }
    );
  }
}
