import { NextRequest, NextResponse } from "next/server";
import { blogService } from "@/server/wiring";
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";
import { UpdateCategorySchema } from "@/features/blog/server/schemas";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";

const logger = createLogger("api/categories/[id]");

/**
 * GET /api/categories/[id]
 * Returns a single category with parent & children info.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const category = await blogService.getCategoryById(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    // Also fetch breadcrumb for the full hierarchy path
    const breadcrumb = await blogService.getCategoryBreadcrumb(id);

    return NextResponse.json({
      success: true,
      data: { ...category, breadcrumb },
    });
  } catch (error) {
    logger.error("[api/categories/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/categories/[id]
 * Body: { name?, description?, color?, icon?, image?, featured?, sortOrder?, parentId? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    const category = await blogService.updateCategory(id, parsed.data);

    return NextResponse.json({ success: true, data: category });
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const message = (error as { message?: string })?.message ?? "Failed to update category";
    logger.error("[api/categories/[id]] PATCH error:", { error });
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * DELETE /api/categories/[id]
 * Moves children up to the deleted category's parent (or root).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Fetch category slug before deletion for ad slot auto-exclude
    const category = await blogService.getCategoryById(id);

    await blogService.deleteCategory(id);

    // Auto-exclude: remove this category's pageType from ad slots
    if (category) {
      try {
        const { removePageTypesFromSlots } = await import(
          "@/features/ads/server/scan-pages"
        );
        const { prisma } = await import("@/server/db/prisma");
        await removePageTypesFromSlots(prisma as unknown as ScanPrisma, [
          `category:${category.slug}`,
        ]);
        logger.info(
          `Auto-excluded category pageType from ad slots: category:${category.slug}`,
        );
      } catch {
        // Ads module may not be available — non-critical
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    const message = (error as { message?: string })?.message ?? "Failed to delete category";
    logger.error("[api/categories/[id]] DELETE error:", { error });
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
