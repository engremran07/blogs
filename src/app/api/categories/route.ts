import { NextRequest, NextResponse } from "next/server";
import { blogService } from "@/server/wiring";
import { prisma } from "@/server/db/prisma";
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";
import { CreateCategorySchema, BulkCreateCategoriesSchema } from "@/features/blog/server/schemas";
import { z } from "zod";

const logger = createLogger("api/categories");

/**
 * GET /api/categories
 * Query params:
 *   ?tree=true     — returns nested tree structure
 *   ?featured=true — only featured categories
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get("tree") === "true";
    const featured = searchParams.get("featured") === "true";

    if (tree) {
      const data = await blogService.getCategoryTree();
      return NextResponse.json({ success: true, data });
    }

    const data = await blogService.getCategories(featured);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("[api/categories] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/categories
 * Body: { name, description?, color?, icon?, image?, featured?, sortOrder?, parentId? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();

    // ── Bulk creation: comma-separated names ──
    if (body.names && typeof body.names === "string") {
      const bulkParsed = BulkCreateCategoriesSchema.safeParse(body);
      if (!bulkParsed.success) {
        const message = bulkParsed.error.issues.map((e: { message: string }) => e.message).join(", ");
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 },
        );
      }

      const { names, ...shared } = bulkParsed.data;
      const created: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < names.length; i++) {
        try {
          const cat = await blogService.createCategory({
            name: names[i],
            description: shared.description ?? null,
            color: shared.color ?? null,
            icon: shared.icon ?? null,
            image: shared.image ?? null,
            featured: shared.featured ?? false,
            sortOrder: i,
            parentId: shared.parentId ?? null,
          });
          created.push(cat);

          // Auto-include ad slot page types
          try {
            const { addPageTypesToSlots } = await import("@/features/ads/server/scan-pages");
            const { prisma } = await import("@/server/db/prisma");
            await addPageTypesToSlots(prisma as any, [`category:${cat.slug}`]);
          } catch {
            // Ads module may not be available — non-critical
          }
        } catch (err: any) {
          errors.push(`"${names[i]}": ${err?.message || "Failed to create"}`);
        }
      }

      return NextResponse.json(
        {
          success: true,
          data: created,
          meta: {
            total: names.length,
            created: created.length,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined,
          },
        },
        { status: 201 },
      );
    }

    // ── Single creation ──
    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    const category = await blogService.createCategory(parsed.data);

    // Auto-include: add this category's pageType to ad slots with wildcard patterns
    try {
      const { addPageTypesToSlots } = await import("@/features/ads/server/scan-pages");
      const { prisma } = await import("@/server/db/prisma");
      await addPageTypesToSlots(prisma as any, [`category:${category.slug}`]);
    } catch {
      // Ads module may not be available — non-critical
    }

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    const status = error?.statusCode ?? 500;
    const message = error?.message ?? "Failed to create category";
    logger.error("[api/categories] POST error:", { error });
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/** Zod schema for bulk reorder items */
const ReorderItemSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int().min(0),
  parentId: z.string().min(1).nullable(),
});
const BulkReorderSchema = z.object({
  items: z.array(ReorderItemSchema).min(1).max(500),
});

/**
 * PUT /api/categories
 * Bulk reorder categories: accepts array of { id, sortOrder, parentId }
 * Body: { items: [{ id, sortOrder, parentId }] }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = BulkReorderSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }
    const { items } = parsed.data;

    // Batch update all categories in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            parentId: item.parentId ?? null,
          },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[api/categories] PUT reorder error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to reorder categories" },
      { status: 500 },
    );
  }
}
