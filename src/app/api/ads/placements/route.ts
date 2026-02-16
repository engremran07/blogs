/**
 * /api/ads/placements — CRUD for ad placements
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";
import {
  createPlacementSchema,
  pageQuerySchema,
} from "@/features/ads/server/schemas";

export async function GET(req: NextRequest) {
  try {
    // If pageType is provided, return public placements for that page (no auth required)
    const pageType = req.nextUrl.searchParams.get("pageType");
    if (pageType) {
      const params = Object.fromEntries(req.nextUrl.searchParams);
      const query = pageQuerySchema.parse(params);
      const placements = await adsService.findPlacementsForPage(
        query.pageType,
        query.category,
        query.containerWidth,
      );
      return NextResponse.json({ success: true, data: placements });
    }

    // Admin-only: return all placements
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const placements = await adsService.findAllPlacements();
    return NextResponse.json({ success: true, data: placements });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = createPlacementSchema.parse(body);
    const placement = await adsService.createPlacement(input);
    return NextResponse.json({ success: true, data: placement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e: any) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}
