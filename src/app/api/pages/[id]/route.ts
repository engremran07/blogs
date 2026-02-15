import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { pageService, prisma } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import { UpdatePageSchema } from "@/features/pages/server/schemas";
import { PageError } from "@/features/pages/types";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";

const logger = createLogger("api/pages");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const page = await pageService.findById(id);
    if (!page) {
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
    const { id } = await params;
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

    const existingPage = await prisma.page.findUnique({ where: { id } });
    if (!existingPage) {
      return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
    }

    if (body.slug) {
      const existing = await prisma.page.findFirst({
        where: { slug: body.slug, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 });
      }
    }

    const parsed = UpdatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const page = await pageService.updatePage(id, parsed.data);
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
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    // Fetch the page slug before soft-deleting so we can auto-exclude
    const existing = await pageService.findById(id);

    const page = await pageService.softDelete(id);

    // Auto-exclude this page from ad slot pageTypes
    if (existing?.slug) {
      void removePageTypesFromSlots(prisma as any, [`page:${existing.slug}`]).catch(() => {});
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
