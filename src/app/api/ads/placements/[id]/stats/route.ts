/**
 * /api/ads/placements/[id]/stats — Get placement analytics
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { adsService } from "@/server/wiring";
import { statsQuerySchema } from "@/features/ads/server/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { days } = statsQuerySchema.parse(params);
    const stats = await adsService.getPlacementStats(id, days);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
