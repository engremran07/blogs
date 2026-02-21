import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireAuth } from "@/server/api-auth";
import { pageService, prisma } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import {
  CreatePageSchema,
  PageListSchema,
} from "@/features/pages/server/schemas";
import { PageError } from "@/features/pages/types";
import { addPageTypesToSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import { InterlinkService } from "@/features/seo/server/interlink.service";
import type { InterlinkPrisma } from "@/features/seo/server/interlink.service";

const logger = createLogger("api/pages");

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

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = PageListSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // SEC-008: Non-admin users can only see PUBLISHED pages
    const session = await auth();
    const isAdmin =
      session?.user &&
      ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role);
    const findOpts = { ...parsed.data };
    if (!isAdmin) {
      findOpts.status = "PUBLISHED" as typeof findOpts.status;
      findOpts.includeDeleted = false;
    }

    const result = await pageService.findAll(findOpts);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    logger.error("[api/pages] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch pages" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: "moderator" });
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

    const authorId = userId || body.authorId;
    body.authorId = authorId;

    const parsed = CreatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { tagIds, ...pageData } = parsed.data;
    const page = await pageService.createPage({ ...pageData, tagIds });

    // Auto-include this new page in ad slot pageTypes
    if (page.slug) {
      void addPageTypesToSlots(scanPrisma, [`page:${page.slug}`]).catch(
        () => {},
      );
    }

    // Interlink lifecycle: scan for link suggestions
    new InterlinkService(interlinkPrisma)
      .onContentCreated(page.id, "PAGE", parsed.data.status || "DRAFT")
      .catch((err: unknown) =>
        logger.error("[api/pages] Interlink onContentCreated error:", {
          error: err,
        }),
      );

    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    if (error instanceof PageError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/pages] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to create page" },
      { status: 500 },
    );
  }
}
