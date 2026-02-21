import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireAuth } from "@/server/api-auth";
import { pageService, prisma } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UpdatePageSchema } from "@/features/pages/server/schemas";
import { PageError } from "@/features/pages/types";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import {
  InterlinkService,
  type InterlinkPrisma,
} from "@/features/seo/server/interlink.service";

const logger = createLogger("api/pages");

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

const interlinkPrisma: InterlinkPrisma = {
  post: {
    findMany: (args) => prisma.post.findMany(args as never),
    findUnique: (args) => prisma.post.findUnique(args as never),
    update: (args) => prisma.post.update(args as never),
    count: (args) => prisma.post.count(args as never),
  },
  page: {
    findMany: (args) => prisma.page.findMany(args as never),
    findUnique: (args) => prisma.page.findUnique(args as never),
    update: (args) => prisma.page.update(args as never),
    count: (args) => prisma.page.count(args as never),
  },
  internalLink: {
    findMany: (args) => prisma.internalLink.findMany(args as never),
    findFirst: (args) => prisma.internalLink.findFirst(args as never),
    findUnique: (args) => prisma.internalLink.findUnique(args as never),
    create: (args) => prisma.internalLink.create(args as never),
    update: (args) => prisma.internalLink.update(args as never),
    updateMany: (args) => prisma.internalLink.updateMany(args as never),
    delete: (args) => prisma.internalLink.delete(args as never),
    deleteMany: (args) => prisma.internalLink.deleteMany(args as never),
    count: (args) => prisma.internalLink.count(args as never),
    upsert: (args) => prisma.internalLink.upsert(args as never),
  },
  interlinkExclusion: {
    findMany: (args) => prisma.interlinkExclusion.findMany(args as never),
    create: (args) => prisma.interlinkExclusion.create(args as never),
    delete: (args) => prisma.interlinkExclusion.delete(args as never),
    deleteMany: (args) => prisma.interlinkExclusion.deleteMany(args as never),
    count: (args) => prisma.interlinkExclusion.count(args as never),
  },
};

const scanPrisma: ScanPrisma = {
  category: {
    findMany: (args) => prisma.category.findMany(args as never),
  },
  tag: {
    findMany: (args) => prisma.tag.findMany(args as never),
  },
  page: {
    findMany: (args) => prisma.page.findMany(args as never),
  },
  post: {
    count: (args) => prisma.post.count(args as never),
    findMany: (args) => prisma.post.findMany(args as never),
  },
  adSlot: {
    findMany: (args) => prisma.adSlot.findMany(args as never),
    update: (args) => prisma.adSlot.update(args as never),
  },
};

/**
 * Resolve the [id] param to a page record.
 * Accepts either a cuid or a slug. Tries slug first (more common in admin URLs),
 * then falls back to id lookup.
 */
async function resolvePageByIdentifier(identifier: string) {
  // Try slug first (slugs are lowercase alphanumeric + hyphens)
  const page = await pageService.findBySlug(identifier);
  if (page) return page;
  // Fall back to cuid lookup
  return pageService.findById(identifier);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;
    const page = await resolvePageByIdentifier(identifier);
    if (!page) {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 },
      );
    }
    // SEC-008: Non-admin users can only view PUBLISHED pages
    const session = await auth();
    const isAdmin =
      session?.user &&
      ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role);
    if (!isAdmin && toRecord(page).status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    logger.error("[api/pages/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch page" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;
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

    // Resolve identifier (slug or cuid) to the actual page
    const resolved = await resolvePageByIdentifier(identifier);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 },
      );
    }
    const id = resolved.id;

    const existingPage = resolved;

    if (body.slug) {
      const existing = await prisma.page.findFirst({
        where: { slug: body.slug, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Slug already in use" },
          { status: 409 },
        );
      }
    }

    const parsed = UpdatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { tagIds, ...pageData } = parsed.data;
    const page = await pageService.updatePage(id, { ...pageData, tagIds });

    // Interlink lifecycle: handle slug/content/status changes
    const interlinkChanges: {
      slug?: { old: string; new: string };
      statusChanged?: boolean;
      contentChanged?: boolean;
    } = {};
    if (body.slug && body.slug !== existingPage.slug) {
      interlinkChanges.slug = { old: existingPage.slug, new: body.slug };
    }
    if (body.status && body.status !== existingPage.status) {
      interlinkChanges.statusChanged = true;
      if (existingPage.status === "PUBLISHED" && body.status !== "PUBLISHED") {
        new InterlinkService(interlinkPrisma)
          .onContentUnpublished(id, "PAGE", existingPage.slug)
          .catch((err: unknown) =>
            logger.error(
              "[api/pages/[id]] Interlink onContentUnpublished error:",
              { error: err },
            ),
          );
      }
    }
    if (body.content) interlinkChanges.contentChanged = true;
    if (Object.keys(interlinkChanges).length > 0) {
      new InterlinkService(interlinkPrisma)
        .onContentUpdated(id, "PAGE", interlinkChanges)
        .catch((err: unknown) =>
          logger.error("[api/pages/[id]] Interlink onContentUpdated error:", {
            error: err,
          }),
        );
    }

    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    if (error instanceof PageError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/pages/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update page" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;
    const { errorResponse } = await requireAuth({ level: "admin" });
    if (errorResponse) return errorResponse;

    // Resolve identifier (slug or cuid) to the actual page
    const existing = await resolvePageByIdentifier(identifier);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 },
      );
    }
    const id = existing.id;

    const page = await pageService.softDelete(id);

    // Interlink lifecycle: handle deleted page
    if (existing?.slug) {
      new InterlinkService(interlinkPrisma)
        .onContentDeleted(id, "PAGE", existing.slug)
        .catch((err: unknown) =>
          logger.error("[api/pages/[id]] Interlink onContentDeleted error:", {
            error: err,
          }),
        );
    }

    // Auto-exclude this page from ad slot pageTypes
    if (existing?.slug) {
      void removePageTypesFromSlots(scanPrisma, [
        `page:${existing.slug}`,
      ]).catch(() => {});
    }

    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    if (error instanceof PageError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/pages/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete page" },
      { status: 500 },
    );
  }
}
