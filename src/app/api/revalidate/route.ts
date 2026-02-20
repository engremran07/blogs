/**
 * POST /api/revalidate
 *
 * Revalidates cached pages. Used by the AdminBar SiteNameDropdown for
 * "Clear Cache" and "Rebuild Site" actions.
 *
 * Query params:
 *   ?all=true  — revalidate the entire site (all paths)
 *   (default)  — revalidate the homepage and blog index
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/api-auth";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/revalidate");

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const all = req.nextUrl.searchParams.get("all") === "true";

    if (all) {
      // Revalidate the entire site
      revalidatePath("/", "layout");
      logger.info("Full site revalidation triggered", {
        userId,
      });
    } else {
      // Revalidate key pages
      revalidatePath("/");
      revalidatePath("/blog");
      logger.info("Partial revalidation triggered (home + blog)", {
        userId,
      });
    }

    return NextResponse.json({
      success: true,
      message: all ? "Full site revalidation triggered" : "Cache cleared",
    });
  } catch (error) {
    logger.error("Revalidation failed", { error });
    return NextResponse.json(
      { success: false, error: "Revalidation failed" },
      { status: 500 },
    );
  }
}
