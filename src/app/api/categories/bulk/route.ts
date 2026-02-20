import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/db/prisma";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/categories/bulk");

const bulkIdsSchema = z.array(z.string().min(1)).min(1).max(200);

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const body: unknown = await req.json();
    const { action, ids } = body as { action: string; ids: unknown };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No IDs provided" },
        { status: 400 },
      );
    }

    const idsResult = bulkIdsSchema.safeParse(ids);
    if (!idsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid IDs",
          details: idsResult.error.flatten().formErrors,
        },
        { status: 400 },
      );
    }
    const validIds: string[] = idsResult.data;

    switch (action) {
      case "delete": {
        // Fetch slugs + parentIds before deleting so we can reassign children
        // and remove ad slot page types
        const categoriesToDelete = await prisma.category.findMany({
          where: { id: { in: validIds } },
          select: { id: true, slug: true, parentId: true },
        });

        const categoryIds = categoriesToDelete.map((c) => c.id);

        // Reassign children of each category to its parent (or root)
        for (const cat of categoriesToDelete) {
          await prisma.category.updateMany({
            where: { parentId: cat.id },
            data: { parentId: cat.parentId ?? null },
          });
        }

        const result = await prisma.category.deleteMany({
          where: { id: { in: categoryIds } },
        });

        // Auto-exclude deleted categories from ad slot pageTypes
        const pageTypes = categoriesToDelete.map(
          (c) => `category:${c.slug}`,
        );
        if (pageTypes.length > 0) {
          void removePageTypesFromSlots(
            prisma as unknown as ScanPrisma,
            pageTypes,
          ).catch(() => {});
        }

        return NextResponse.json({
          success: true,
          message: `${result.count} categories deleted`,
        });
      }

      case "feature": {
        const result = await prisma.category.updateMany({
          where: { id: { in: validIds } },
          data: { featured: true },
        });
        return NextResponse.json({
          success: true,
          message: `${result.count} categories featured`,
        });
      }

      case "unfeature": {
        const result = await prisma.category.updateMany({
          where: { id: { in: validIds } },
          data: { featured: false },
        });
        return NextResponse.json({
          success: true,
          message: `${result.count} categories unfeatured`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error("[api/categories/bulk] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Bulk action failed" },
      { status: 500 },
    );
  }
}
