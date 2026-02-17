/**
 * /api/ads/placements/[id] — Single placement CRUD
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";
import { updatePlacementSchema } from "@/features/ads/server/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const placement = await adsService.findPlacementById(id);
    if (!placement) {
      return NextResponse.json(
        { success: false, error: { code: "PLACEMENT_NOT_FOUND", message: "Placement not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: placement });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const input = updatePlacementSchema.parse(body);
    const placement = await adsService.updatePlacement(id, input);
    return NextResponse.json({ success: true, data: placement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e: any) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    await adsService.deletePlacement(id);
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
