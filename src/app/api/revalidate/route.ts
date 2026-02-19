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
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/revalidate");

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const role = session.user.role;
    if (!["ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const all = req.nextUrl.searchParams.get("all") === "true";

    if (all) {
      // Revalidate the entire site
      revalidatePath("/", "layout");
      logger.info("Full site revalidation triggered", {
        userId: session.user.id,
      });
    } else {
      // Revalidate key pages
      revalidatePath("/");
      revalidatePath("/blog");
      logger.info("Partial revalidation triggered (home + blog)", {
        userId: session.user.id,
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
