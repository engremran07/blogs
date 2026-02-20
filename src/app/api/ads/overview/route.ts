/**
 * /api/ads/overview — Aggregate ad stats overview
 * Kill switch: adsEnabled in SiteSettings
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { adsService } from "@/server/wiring";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const stats = await adsService.getOverviewStats();
    return NextResponse.json({ success: true, data: stats });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
