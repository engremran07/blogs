/**
 * /api/ads/placements/[id]/stats — Get placement analytics
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";
import { statsQuerySchema } from "@/features/ads/server/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { days } = statsQuerySchema.parse(params);
    const stats = await adsService.getPlacementStats(id, days);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}
