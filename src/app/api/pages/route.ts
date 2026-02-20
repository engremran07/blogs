import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireAuth } from "@/server/api-auth";
import { pageService, prisma } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { CreatePageSchema, PageListSchema } from "@/features/pages/server/schemas";
import { PageError } from "@/features/pages/types";
import { addPageTypesToSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import { InterlinkService } from "@/features/seo/server/interlink.service";
import type { InterlinkPrisma } from "@/features/seo/server/interlink.service";

const logger = createLogger("api/pages");

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
    const isAdmin = session?.user && ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role);
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
    const { userId, errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const body = await req.json();

    if (body.slug) {
      body.slug = body.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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

    const page = await pageService.createPage(parsed.data);

    // Auto-include this new page in ad slot pageTypes
    if (page.slug) {
      void addPageTypesToSlots(prisma as unknown as ScanPrisma, [`page:${page.slug}`]).catch(() => {});
    }

    // Interlink lifecycle: scan for link suggestions
    new InterlinkService(prisma as unknown as InterlinkPrisma).onContentCreated(page.id, 'PAGE', parsed.data.status || 'DRAFT').catch((err: unknown) =>
      logger.error("[api/pages] Interlink onContentCreated error:", { error: err }),
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
