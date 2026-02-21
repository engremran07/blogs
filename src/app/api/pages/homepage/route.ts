import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { pageService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/pages/homepage");

/**
 * GET /api/pages/homepage
 * Returns the current home page (if any) plus all published pages for the dropdown.
 */
export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: "moderator" });
    if (errorResponse) return errorResponse;

    const [homePage, allPages] = await Promise.all([
      pageService.getHomePage(),
      pageService.findAll({
        status: "PUBLISHED",
        limit: 500,
        sortBy: "title",
        sortOrder: "asc",
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        currentHomePageId: homePage?.id || null,
        currentHomePageTitle: homePage?.title || null,
        pages: allPages.data.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          isHomePage: p.isHomePage,
        })),
      },
    });
  } catch (error: unknown) {
    logger.error("Failed to get homepage config", error as Record<string, unknown>);
    return NextResponse.json(
      { success: false, error: "Failed to load homepage configuration" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/pages/homepage
 * Set a page as the home page, or clear the home page (pass pageId: null).
 */
export async function PATCH(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: "admin" });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { pageId } = body as { pageId: string | null };

    if (pageId === null || pageId === "") {
      // Clear home page — set all isHomePage to false
      const { prisma } = await import("@/server/db/prisma");
      await prisma.page.updateMany({
        where: { isHomePage: true },
        data: { isHomePage: false },
      });

      logger.info("Home page cleared by admin");
      return NextResponse.json({
        success: true,
        data: { currentHomePageId: null, currentHomePageTitle: null },
        message: "Home page reset to default blog layout",
      });
    }

    // Set the specified page as home page
    const page = await pageService.setAsHomePage(pageId);
    logger.info(`Home page set to: ${page.id} — "${page.title}"`);

    return NextResponse.json({
      success: true,
      data: {
        currentHomePageId: page.id,
        currentHomePageTitle: page.title,
      },
      message: `"${page.title}" is now your home page`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set home page";
    logger.error("Failed to set homepage", error as Record<string, unknown>);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
