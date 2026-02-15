import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { pageService, prisma } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { CreatePageSchema, PageListSchema } from "@/features/pages/server/schemas";
import { PageError } from "@/features/pages/types";
import { addPageTypesToSlots } from "@/features/ads/server/scan-pages";

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

    const result = await pageService.findAll(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
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
    }

    const authorId = (session.user as any).id || body.authorId;
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
      void addPageTypesToSlots(prisma as any, [`page:${page.slug}`]).catch(() => {});
    }

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
